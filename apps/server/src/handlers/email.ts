import { handleResendWebhook } from '../email/webhook'
import { EmailService } from '../services/EmailService'
import { SenderService } from '../services/SenderService'
import { ok, type Rep, type Req } from './_shared'

const email = new EmailService()
const senders = new SenderService()

export const listEmailTemplates = async (r: Req, reply: Rep) => ok(reply, await email.listTemplates(r.ctx))
export const updateEmailTemplate = async (r: Req, reply: Rep) => ok(reply, await email.updateTemplate(r.ctx, r.params.id, r.body))
export const renderEmail = async (r: Req, reply: Rep) => ok(reply, await email.render(r.ctx, r.body))
export const listMessages = async (r: Req, reply: Rep) => ok(reply, await email.list(r.ctx, r.query))
export const sendEmail = async (r: Req, reply: Rep) => ok(reply, await email.send(r.ctx, r.body), 202)
export const getMessage = async (r: Req, reply: Rep) => ok(reply, await email.get(r.ctx, r.params.id))
export const retryMessage = async (r: Req, reply: Rep) => ok(reply, await email.retry(r.ctx, r.params.id), 202)
export const listSenders = async (r: Req, reply: Rep) => ok(reply, await senders.list(r.ctx))
export const createSender = async (r: Req, reply: Rep) => ok(reply, await senders.create(r.ctx, r.body), 201)
export async function deleteSender(r: Req, reply: Rep) {
  await senders.remove(r.ctx, r.params.id)
  return ok(reply, null)
}
export const verifySender = async (r: Req, reply: Rep) => ok(reply, await senders.verify(r.ctx, r.params.id))

export async function receiveResendWebhook(r: Req, reply: Rep) {
  await handleResendWebhook(r.headers as Record<string, unknown>, (r as any).rawBody)
  return ok(reply, { received: true })
}
