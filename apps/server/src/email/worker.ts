import { db, type EmailProvider, type MessageStatus, type Prisma } from '@project/db'
import { config } from '../lib/config'
import { isUniqueViolation } from '../lib/idempotency'
import { senderApiKey } from '../services/SenderService'
import { transportFor } from './transport'

const MAX_ATTEMPTS = 5
const LOCK_MS = 60_000
const BATCH = 10

type Logger = { info: (o: object, m?: string) => void; error: (o: object, m?: string) => void }
let logger: Logger = { info: () => {}, error: (o, m) => console.error(m, o) }
let timer: NodeJS.Timeout | null = null
let running = false
let wakeRequested = false
let immediateDevDelivery = false

/** Seed/scripts: apply simulated dev delivery synchronously instead of after a delay. */
export function setImmediateDevDelivery(on: boolean) {
  immediateDevDelivery = on
}

/**
 * Email outbox worker. OutboundMessage rows are the queue: the API commits the frozen
 * message, the worker claims it with a conditional update (safe with several instances),
 * sends with the message id as provider idempotency key, and records every attempt.
 */
export function startWorker(log?: Logger) {
  if (log) logger = log
  if (timer) return
  timer = setInterval(() => void tick(), config.WORKER_POLL_MS)
  timer.unref()
  void tick()
}

export function stopWorker() {
  if (timer) clearInterval(timer)
  timer = null
}

export function notifyWorker() {
  if (!timer) return
  wakeRequested = true
  setImmediate(() => void tick())
}

async function tick() {
  if (running) return
  running = true
  try {
    do {
      wakeRequested = false
      await processBatch()
    } while (wakeRequested)
  } catch (err) {
    logger.error({ err }, 'email worker tick failed')
  } finally {
    running = false
  }
}

export async function processBatch() {
  const now = new Date()
  const candidates = await db.outboundMessage.findMany({
    where: {
      OR: [
        { status: 'QUEUED', nextAttemptAt: { lte: now } },
        { status: 'SENDING', lockedUntil: { lt: now } }, // crashed mid-send: provider idempotency prevents a double send
      ],
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: BATCH,
    select: { id: true, status: true, organizationId: true },
  })
  if (!candidates.length) return 0
  // Operational log rows are written per tenant so company admins only see their own runs.
  const startedAt = new Date()
  const byOrg = new Map<string, Record<'sent' | 'retrying' | 'failed' | 'skipped', number>>()
  for (const c of candidates) {
    const tally = byOrg.get(c.organizationId) ?? { sent: 0, retrying: 0, failed: 0, skipped: 0 }
    byOrg.set(c.organizationId, tally)
    const claimed = await db.outboundMessage.updateMany({
      where: { id: c.id, status: c.status, ...(c.status === 'SENDING' ? { lockedUntil: { lt: now } } : {}) },
      data: { status: 'SENDING', lockedUntil: new Date(Date.now() + LOCK_MS), attempts: { increment: 1 } },
    })
    if (claimed.count === 0) {
      tally.skipped++
      continue
    }
    tally[await dispatch(c.id)]++
  }
  for (const [organizationId, tally] of byOrg) {
    if (tally.sent + tally.retrying + tally.failed === 0) continue
    await db.workerRun.create({
      data: {
        organizationId,
        kind: 'email.dispatch',
        status: tally.failed ? 'PARTIALLY_COMPLETED' : 'SUCCEEDED',
        detail: tally,
        startedAt,
        finishedAt: new Date(),
      },
    })
  }
  return candidates.length
}

async function dispatch(id: string): Promise<'sent' | 'retrying' | 'failed'> {
  const m = await db.outboundMessage.findUniqueOrThrow({ where: { id } })
  const sender = await db.senderIdentity.findUnique({ where: { id: m.senderIdentityId } })
  let result
  try {
    if (!sender || sender.verification !== 'VERIFIED') {
      result = { ok: false as const, retryable: false, code: 'sender_unverified', summary: 'Sender is no longer verified' }
    } else {
      result = await transportFor(m.provider).send(
        { messageId: m.id, from: m.fromSnapshot, replyTo: m.replyToSnapshot, to: m.toEmail, subject: m.subject, text: m.bodyText },
        m.provider === 'RESEND' ? senderApiKey(sender) : null,
      )
    }
  } catch (err) {
    result = { ok: false as const, retryable: true, code: 'exception', summary: (err as Error).message.slice(0, 300) }
  }

  await db.deliveryAttempt.create({
    data: {
      messageId: id,
      attemptNumber: m.attempts,
      outcome: result.ok ? 'accepted' : result.retryable ? 'retryable_error' : 'permanent_error',
      errorCode: result.ok ? null : result.code,
      errorSummary: result.ok ? null : result.summary,
    },
  }).catch((err) => {
    if (!isUniqueViolation(err)) throw err
  })

  if (result.ok) {
    await db.outboundMessage.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.providerMessageId, lockedUntil: null, lastError: null },
    })
    if (m.provider === 'DEV_LOG') simulateDevDelivery(result.providerMessageId, m.toEmail)
    logger.info({ messageId: id, provider: m.provider }, 'email accepted by provider')
    return 'sent'
  }
  if (result.retryable && m.attempts < MAX_ATTEMPTS) {
    const backoff = 30_000 * 2 ** (m.attempts - 1)
    await db.outboundMessage.update({
      where: { id },
      data: { status: 'QUEUED', nextAttemptAt: new Date(Date.now() + backoff), lockedUntil: null, lastError: result.summary },
    })
    return 'retrying'
  }
  await db.outboundMessage.update({
    where: { id },
    data: { status: 'FAILED', failedAt: new Date(), lockedUntil: null, lastError: result.summary },
  })
  logger.error({ messageId: id, code: result.code }, 'email failed permanently')
  return 'failed'
}

/** Dev transport: produce clearly-labelled simulated provider events after a short delay. */
function simulateDevDelivery(providerMessageId: string, to: string) {
  const bounce = to.endsWith('@bounce.test')
  const fire = () =>
    applyProviderEvent({
      provider: 'DEV_LOG',
      providerEventId: `${providerMessageId}:${bounce ? 'bounced' : 'delivered'}`,
      type: bounce ? 'email.bounced' : 'email.delivered',
      providerMessageId,
      occurredAt: new Date(),
      payload: { simulated: true, note: 'Development transport — no real delivery occurred' },
    }).catch((err) => logger.error({ err }, 'simulated provider event failed'))
  if (config.isTest || immediateDevDelivery) void fire()
  else setTimeout(fire, 1500).unref()
}

const RANK: Record<MessageStatus, number> = { QUEUED: 0, SENDING: 1, SENT: 2, DELIVERED: 3, BOUNCED: 3, FAILED: 3 }

/**
 * Applies a provider webhook (or simulated dev) event. Duplicate deliveries are ignored by
 * the unique (provider, providerEventId) key; out-of-order events never move a message
 * backwards (e.g. a late "sent" after "delivered").
 */
export async function applyProviderEvent(e: {
  provider: EmailProvider
  providerEventId: string
  type: string
  providerMessageId: string | null
  occurredAt: Date
  payload: Prisma.InputJsonValue
}) {
  const message = e.providerMessageId ? await db.outboundMessage.findUnique({ where: { providerMessageId: e.providerMessageId } }) : null
  try {
    await db.emailProviderEvent.create({
      data: {
        provider: e.provider,
        providerEventId: e.providerEventId,
        messageId: message?.id ?? null,
        type: e.type,
        occurredAt: e.occurredAt,
        payload: e.payload,
      },
    })
  } catch (err) {
    if (isUniqueViolation(err)) return { duplicate: true }
    throw err
  }
  if (!message) return { duplicate: false, matched: false }

  const next: { status: MessageStatus; data: Prisma.OutboundMessageUpdateInput } | null =
    e.type === 'email.sent'
      ? { status: 'SENT', data: { sentAt: message.sentAt ?? e.occurredAt } }
      : e.type === 'email.delivered'
        ? { status: 'DELIVERED', data: { deliveredAt: e.occurredAt } }
        : e.type === 'email.bounced'
          ? { status: 'BOUNCED', data: { failedAt: e.occurredAt, lastError: bounceReason(e.payload) } }
          : null
  if (next && RANK[next.status] > RANK[message.status]) {
    await db.outboundMessage.update({ where: { id: message.id }, data: { ...next.data, status: next.status } })
  }
  return { duplicate: false, matched: true }
}

function bounceReason(payload: Prisma.InputJsonValue) {
  const p = payload as { data?: { bounce?: { message?: string } }; simulated?: boolean }
  if (p?.simulated) return 'Simulated bounce (development transport)'
  return p?.data?.bounce?.message?.slice(0, 300) ?? 'The recipient’s mail server rejected the message'
}
