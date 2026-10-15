import { db, type Prisma } from '@project/db'
import { randomBytes } from 'crypto'
import { appendActivity, transaction } from '../lib/activity'
import { loadContact, loadOpportunity } from '../lib/access'
import { requireOrg, type AuthContext } from '../lib/context'
import { config } from '../lib/config'
import { sha256 } from '../lib/crypto'
import { HttpError, notFound, unprocessable } from '../lib/errors'
import { currentWorkflow } from '../lib/workflow'
import { localStorageDriver, storage, verifyFileSignature } from '../storage'

// Allow-list by declared type; images and PDFs are also checked by magic bytes.
const ALLOWED: Record<string, string[] | null> = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'],
  'image/heic': null,
  'application/pdf': ['25504446'],
  'text/plain': null,
  'text/csv': null,
  'application/msword': null,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504b0304'],
  'application/vnd.ms-excel': null,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['504b0304'],
}

type UploadTarget = { opportunityId?: string; contactId?: string; stageId?: string; fieldId?: string }

export class AttachmentService {
  /**
   * Stores a file once. With a job + field (stage controls such as Report or Photos) it is
   * linked immediately and logged as `file.uploaded`. Without a field it stays unlinked
   * until a note or post references it, so the composer does not create duplicate events.
   */
  async upload(auth: AuthContext, file: { filename: string; mimetype: string; buffer: Buffer }, target: UploadTarget) {
    const ctx = requireOrg(auth)
    const mimeType = file.mimetype.toLowerCase()
    if (!(mimeType in ALLOWED)) throw new HttpError(415, 'That file type is not supported', 'unsupported_type')
    if (file.buffer.length === 0) throw unprocessable('The file is empty')
    if (file.buffer.length > config.UPLOAD_MAX_MB * 1024 * 1024)
      throw new HttpError(413, `Files are limited to ${config.UPLOAD_MAX_MB} MB`, 'too_large')
    const magic = ALLOWED[mimeType]
    if (magic && !magic.some((m) => file.buffer.subarray(0, m.length / 2).toString('hex') === m))
      throw new HttpError(415, 'The file contents do not match its type', 'type_mismatch')

    const opp = target.opportunityId ? await loadOpportunity(ctx, target.opportunityId) : null
    if (target.contactId) await loadContact(ctx, target.contactId)
    if (opp && target.contactId && opp.contactId !== target.contactId) throw unprocessable('Job and contact do not match')
    let stageId = target.stageId ?? null
    if (opp && (stageId || target.fieldId)) {
      const { definition } = await currentWorkflow(ctx.orgId)
      if (stageId && !definition.stages.some((s) => s.id === stageId)) throw unprocessable('Unknown stage')
      if (target.fieldId) {
        const field = definition.fields.find((f) => f.id === target.fieldId)
        if (!field || !['attachment', 'gallery'].includes(field.type)) throw unprocessable('That field does not accept files')
        stageId ??= definition.stages.find((s) => s.fieldIds.includes(field.id))?.id ?? opp.stageId
      }
    }

    const fileName = sanitizeName(file.filename)
    const key = `${ctx.orgId}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString('hex')}`
    await storage().put(key, file.buffer, mimeType)

    const linkId = await transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          organizationId: ctx.orgId,
          storageKey: key,
          fileName,
          mimeType,
          byteLength: file.buffer.length,
          sha256: sha256(file.buffer),
          uploadedById: ctx.userId,
        },
      })
      if (!opp && !target.contactId) {
        // Pending upload for a post/note: return a link-less ref keyed by the attachment.
        return { attachmentId: attachment.id, linkId: null as string | null }
      }
      let activityEventId: string | null = null
      if (opp && target.fieldId) {
        const event = await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'file.uploaded',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: opp.contactId,
          opportunityId: opp.id,
          stageId,
          payload: { fieldId: target.fieldId, fileName, mimeType },
        })
        activityEventId = event.id
      }
      const link = await tx.attachmentLink.create({
        data: {
          organizationId: ctx.orgId,
          attachmentId: attachment.id,
          opportunityId: opp?.id ?? null,
          contactId: opp?.contactId ?? target.contactId ?? null,
          stageId,
          fieldId: target.fieldId ?? null,
          activityEventId,
        },
      })
      return { attachmentId: attachment.id, linkId: link.id as string | null }
    })
    if (linkId.linkId) {
      const [ref] = await attachmentRefs({ id: linkId.linkId })
      return ref!
    }
    const a = await db.attachment.findUniqueOrThrow({ where: { id: linkId.attachmentId } })
    return {
      id: a.id,
      attachmentId: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      byteLength: a.byteLength,
      stageId: null,
      fieldId: null,
      url: await storage().signedUrl(a.storageKey, a.id, a.fileName),
      uploadedAt: a.uploadedAt,
    }
  }

  /** Removes a reference only; the stored file and the history that mentions it remain. */
  async removeLink(auth: AuthContext, linkId: string) {
    const ctx = requireOrg(auth)
    const link = await db.attachmentLink.findFirst({
      where: { id: linkId, organizationId: ctx.orgId },
      include: { attachment: true },
    })
    if (!link) throw notFound('File')
    await transaction(async (tx) => {
      await tx.attachmentLink.delete({ where: { id: link.id } })
      if (link.opportunityId) {
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'file.removed',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: link.contactId,
          opportunityId: link.opportunityId,
          stageId: link.stageId,
          payload: { fileName: link.attachment.fileName, fieldId: link.fieldId },
        })
      }
    })
  }

  /** Public, signature-checked download for the local development driver. */
  async download(id: string, expires: number, signature: string) {
    if (!verifyFileSignature(id, Number(expires), signature)) throw new HttpError(403, 'This link has expired', 'expired')
    const local = localStorageDriver()
    if (!local) throw notFound('File')
    const a = await db.attachment.findUnique({ where: { id } })
    if (!a || a.deletedAt) throw notFound('File')
    return { stream: await local.open(a.storageKey), mimeType: a.mimeType, fileName: a.fileName }
  }
}

/** Links attachments that were uploaded ahead of a note or post. */
export async function linkPendingAttachments(
  tx: Prisma.TransactionClient,
  args: { organizationId: string; attachmentIds: string[]; activityEventId: string; opportunityId?: string | null; contactId?: string | null; stageId?: string | null },
) {
  if (!args.attachmentIds.length) return
  const rows = await tx.attachment.findMany({
    where: { id: { in: args.attachmentIds }, organizationId: args.organizationId, deletedAt: null },
  })
  if (rows.length !== new Set(args.attachmentIds).size) throw unprocessable('One or more attachments were not found')
  await tx.attachmentLink.createMany({
    data: rows.map((a) => ({
      organizationId: args.organizationId,
      attachmentId: a.id,
      activityEventId: args.activityEventId,
      opportunityId: args.opportunityId ?? null,
      contactId: args.contactId ?? null,
      stageId: args.stageId ?? null,
    })),
  })
}

export async function attachmentRefs(where: Prisma.AttachmentLinkWhereInput) {
  const links = await db.attachmentLink.findMany({
    where: { ...where, attachment: { deletedAt: null } },
    include: { attachment: true },
    orderBy: { createdAt: 'desc' },
  })
  return Promise.all(links.map(refOut))
}

export async function refOut(l: { id: string; stageId: string | null; fieldId: string | null; attachment: { id: string; storageKey: string; fileName: string; mimeType: string; byteLength: number; uploadedAt: Date } }) {
  return {
    id: l.id,
    attachmentId: l.attachment.id,
    fileName: l.attachment.fileName,
    mimeType: l.attachment.mimeType,
    byteLength: l.attachment.byteLength,
    stageId: l.stageId,
    fieldId: l.fieldId,
    url: await storage().signedUrl(l.attachment.storageKey, l.attachment.id, l.attachment.fileName),
    uploadedAt: l.attachment.uploadedAt,
  }
}

function sanitizeName(name: string) {
  const cleaned = name.replace(/[\\/\r\n\0]/g, '_').trim().slice(0, 180)
  return cleaned || 'file'
}
