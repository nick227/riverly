import { mkdir, writeFile } from 'fs/promises'
import { resolve } from 'path'
import type { EmailProvider } from '@project/db'
import { config } from '../lib/config'
import { REPO_ROOT } from '../storage'

type OutgoingEmail = {
  messageId: string // Riverly id — also the provider idempotency key
  from: string
  replyTo?: string | null
  to: string
  subject: string
  text: string
}

type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; retryable: boolean; code: string; summary: string }

interface EmailTransport {
  readonly provider: EmailProvider
  send(email: OutgoingEmail, apiKey: string | null): Promise<SendResult>
}

/**
 * Development transport. Writes each message to .data/outbox/<id>.txt and reports success.
 * Delivery events are simulated by the worker and labelled as such; addresses ending in
 * `@bounce.test` simulate a bounce so failure paths can be exercised locally.
 */
class DevLogTransport implements EmailTransport {
  readonly provider = 'DEV_LOG' as const
  async send(email: OutgoingEmail): Promise<SendResult> {
    if (email.to.endsWith('@fail.test')) return { ok: false, retryable: false, code: 'dev_rejected', summary: 'Simulated provider rejection (dev)' }
    const dir = resolve(REPO_ROOT, config.DEV_OUTBOX_DIR)
    await mkdir(dir, { recursive: true })
    await writeFile(
      resolve(dir, `${email.messageId}.txt`),
      `From: ${email.from}\nTo: ${email.to}\nReply-To: ${email.replyTo ?? ''}\nSubject: ${email.subject}\n\n${email.text}\n`,
    )
    return { ok: true, providerMessageId: `dev_${email.messageId}` }
  }
}

/** Resend HTTP API. The message id is passed as Idempotency-Key so retries never double-send. */
class ResendTransport implements EmailTransport {
  readonly provider = 'RESEND' as const
  async send(email: OutgoingEmail, apiKey: string | null): Promise<SendResult> {
    if (!apiKey) return { ok: false, retryable: false, code: 'no_credentials', summary: 'No Resend API key configured for this sender' }
    let res: Response
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': email.messageId,
        },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          tags: [{ name: 'riverly_message_id', value: email.messageId }],
        }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch (err) {
      return { ok: false, retryable: true, code: 'network', summary: (err as Error).message.slice(0, 200) }
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
    if (res.ok && body.id) return { ok: true, providerMessageId: body.id }
    const retryable = res.status === 429 || res.status >= 500
    return { ok: false, retryable, code: body.name ?? `http_${res.status}`, summary: (body.message ?? `Resend returned ${res.status}`).slice(0, 300) }
  }
}

export async function checkResendDomain(apiKey: string, fromEmail: string) {
  const domain = fromEmail.split('@')[1]?.toLowerCase()
  if (!domain) return { status: 'FAILED' as const, detail: 'Sender email has no domain' }
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  }).catch((err: Error) => ({ ok: false, status: 0, json: async () => ({ message: err.message }) }) as unknown as Response)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    return { status: 'FAILED' as const, detail: `Could not reach Resend: ${body.message ?? res.status}` }
  }
  const body = (await res.json()) as { data?: { name: string; status: string }[] }
  const match = body.data?.find((d) => d.name.toLowerCase() === domain)
  if (!match) return { status: 'FAILED' as const, detail: `${domain} is not added to this Resend account` }
  if (match.status === 'verified') return { status: 'VERIFIED' as const, detail: `${domain} is verified with Resend` }
  return { status: 'PENDING' as const, detail: `${domain} is ${match.status} in Resend — finish DNS verification` }
}

const transports: Record<EmailProvider, EmailTransport> = {
  DEV_LOG: new DevLogTransport(),
  RESEND: new ResendTransport(),
}

export const transportFor = (p: EmailProvider) => transports[p]
