import { db, type EmailProvider } from '@project/db'
import { requirePermission, type AuthContext } from '../lib/context'
import { config } from '../lib/config'
import { decryptSecret, encryptSecret } from '../lib/crypto'
import { notFound, unprocessable } from '../lib/errors'
import { checkResendDomain } from '../email/transport'

export class SenderService {
  async list(auth: AuthContext) {
    const ctx = requirePermission(auth, 'crm.use')
    const rows = await db.senderIdentity.findMany({ where: { organizationId: ctx.orgId }, orderBy: { createdAt: 'asc' } })
    return rows.map(senderOut)
  }

  async create(
    auth: AuthContext,
    input: { provider: EmailProvider; fromName: string; fromEmail: string; replyTo?: string | null; apiKey?: string | null; isDefault?: boolean },
  ) {
    const ctx = requirePermission(auth, 'settings.manage')
    if (input.provider === 'DEV_LOG' && !config.devEmailAllowed) throw unprocessable('The development transport is disabled in this environment')
    if (input.provider === 'RESEND' && !input.apiKey && !config.RESEND_API_KEY)
      throw unprocessable('Enter the company’s Resend API key (or configure a platform key)')
    const row = await db.$transaction(async (tx) => {
      if (input.isDefault) await tx.senderIdentity.updateMany({ where: { organizationId: ctx.orgId }, data: { isDefault: false } })
      return tx.senderIdentity.create({
        data: {
          organizationId: ctx.orgId,
          provider: input.provider,
          fromName: input.fromName.trim(),
          fromEmail: input.fromEmail.trim().toLowerCase(),
          replyTo: input.replyTo?.trim() || null,
          credentialCiphertext: input.apiKey ? encryptSecret(input.apiKey.trim()) : null,
          isDefault: input.isDefault ?? false,
          ...(input.provider === 'DEV_LOG'
            ? { verification: 'VERIFIED', verifiedAt: new Date(), verificationDetail: 'Development transport — messages never leave this machine.' }
            : { verification: 'UNVERIFIED' }),
        },
      })
    })
    return input.provider === 'RESEND' ? this.verify(auth, row.id) : senderOut(row)
  }

  async remove(auth: AuthContext, id: string) {
    const ctx = requirePermission(auth, 'settings.manage')
    const s = await db.senderIdentity.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!s) throw notFound('Sender')
    const pending = await db.outboundMessage.count({ where: { senderIdentityId: id, status: { in: ['QUEUED', 'SENDING'] } } })
    if (pending) throw unprocessable('This sender has messages waiting to send. Try again once they finish.')
    // Destroy credentials; keep the row's identity if messages reference it.
    const used = await db.outboundMessage.count({ where: { senderIdentityId: id } })
    if (used) {
      await db.senderIdentity.update({
        where: { id },
        data: { credentialCiphertext: null, verification: 'UNVERIFIED', isDefault: false, verificationDetail: 'Removed by an admin' },
      })
    } else {
      await db.senderIdentity.delete({ where: { id } })
    }
  }

  async verify(auth: AuthContext, id: string) {
    const ctx = requirePermission(auth, 'settings.manage')
    const s = await db.senderIdentity.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!s) throw notFound('Sender')
    if (s.provider === 'DEV_LOG') return senderOut(s)
    const key = senderApiKey(s)
    const result = key ? await checkResendDomain(key, s.fromEmail) : { status: 'FAILED' as const, detail: 'No API key available' }
    const row = await db.senderIdentity.update({
      where: { id },
      data: {
        verification: result.status,
        verificationDetail: result.detail,
        verifiedAt: result.status === 'VERIFIED' ? new Date() : null,
      },
    })
    return senderOut(row)
  }
}

export function senderApiKey(s: { credentialCiphertext: string | null }) {
  if (s.credentialCiphertext) return decryptSecret(s.credentialCiphertext)
  return config.RESEND_API_KEY ?? null
}

function senderOut(s: {
  id: string
  provider: EmailProvider
  fromName: string
  fromEmail: string
  replyTo: string | null
  verification: string
  verifiedAt: Date | null
  verificationDetail: string | null
  isDefault: boolean
  credentialCiphertext: string | null
}) {
  return {
    id: s.id,
    provider: s.provider,
    fromName: s.fromName,
    fromEmail: s.fromEmail,
    replyTo: s.replyTo,
    verification: s.verification,
    verifiedAt: s.verifiedAt,
    verificationDetail: s.verificationDetail,
    isDefault: s.isDefault,
    hasCredential: !!s.credentialCiphertext,
  }
}
