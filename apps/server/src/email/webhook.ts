import { createHmac } from 'crypto'
import type { Prisma } from '@project/db'
import { config } from '../lib/config'
import { safeEqual } from '../lib/crypto'
import { HttpError } from '../lib/errors'
import { applyProviderEvent } from './worker'

const TOLERANCE_SECONDS = 5 * 60

/** Verifies a Svix-signed Resend webhook (https://docs.svix.com/receiving/verifying-payloads/how-manual). */
function verifySvix(headers: Record<string, unknown>, rawBody: string, secret: string) {
  const id = String(headers['svix-id'] ?? '')
  const timestamp = String(headers['svix-timestamp'] ?? '')
  const signatures = String(headers['svix-signature'] ?? '')
  if (!id || !timestamp || !signatures) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')
  return signatures.split(' ').some((part) => {
    const [, sig] = part.split(',')
    return !!sig && safeEqual(sig, expected)
  })
}

export async function handleResendWebhook(headers: Record<string, unknown>, rawBody: string | undefined) {
  const secret = config.RESEND_WEBHOOK_SECRET
  if (!secret || !rawBody || !verifySvix(headers, rawBody, secret)) throw new HttpError(401, 'Invalid webhook signature', 'bad_signature')
  const event = JSON.parse(rawBody) as { type?: string; created_at?: string; data?: { email_id?: string } }
  await applyProviderEvent({
    provider: 'RESEND',
    providerEventId: String(headers['svix-id']),
    type: event.type ?? 'unknown',
    providerMessageId: event.data?.email_id ?? null,
    occurredAt: event.created_at ? new Date(event.created_at) : new Date(),
    payload: event as unknown as Prisma.InputJsonValue,
  })
}
