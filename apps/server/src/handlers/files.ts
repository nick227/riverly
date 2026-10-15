import { AttachmentService } from '../services/AttachmentService'
import { badRequest } from '../lib/errors'
import { ok, type Rep, type Req } from './_shared'

const attachments = new AttachmentService()

export async function uploadAttachment(r: Req, reply: Rep) {
  const file = await (r as any).file()
  if (!file) throw badRequest('Attach a file in the "file" field')
  let buffer: Buffer
  try {
    buffer = await file.toBuffer()
  } catch (err: any) {
    if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({ error: 'File is too large', code: 'too_large' })
    }
    throw err
  }
  const ref = await attachments.upload(r.ctx, { filename: file.filename, mimetype: file.mimetype, buffer }, r.query)
  return ok(reply, ref, 201)
}

export async function removeAttachmentLink(r: Req, reply: Rep) {
  await attachments.removeLink(r.ctx, r.params.id)
  return ok(reply, null)
}

export async function downloadFile(r: Req, reply: Rep) {
  const file = await attachments.download(r.params.id, r.query.expires, r.query.signature)
  reply.header('Content-Type', file.mimeType)
  reply.header('Content-Disposition', `inline; filename="${file.fileName.replace(/["\\\r\n]/g, '_')}"`)
  reply.header('Cache-Control', 'private, max-age=600')
  reply.header('X-Content-Type-Options', 'nosniff')
  return reply.send(file.stream)
}
