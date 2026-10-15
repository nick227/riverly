import { createHmac } from 'crypto'
import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { processBatch } from '../email/worker'
import { encryptSecret } from '../lib/crypto'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

async function templateId(stableKey: string, headers = t.world.a.member.headers) {
  const list = await call(t.app, 'listEmailTemplates', { method: 'GET', url: '/email/templates', headers }, 200)
  return list.data.find((x: any) => x.stableKey === stableKey).id as string
}

async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean) {
  for (let i = 0; i < 50; i++) {
    const v = await fn()
    if (ok(v)) return v
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('condition not met')
}

function signSvix(body: string, id: string, ts = Math.floor(Date.now() / 1000)) {
  const secret = process.env.RESEND_WEBHOOK_SECRET!
  const sig = createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${id}.${ts}.${body}`).digest('base64')
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}`, 'content-type': 'application/json' }
}

describe('listEmailTemplates', () => {
  it('requires auth', async () => {
    await call(t.app, 'listEmailTemplates', { method: 'GET', url: '/email/templates' }, 401)
  })
  it('seeds the 13 stock templates per company', async () => {
    const list = await call(t.app, 'listEmailTemplates', { method: 'GET', url: '/email/templates', headers: t.world.a.member.headers }, 200)
    expect(list.data).toHaveLength(13)
  })
})

describe('updateEmailTemplate', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateEmailTemplate', { method: 'PATCH', url: '/email/templates/x', payload: {} }, 401)
  })
  it('admins edit wording (version bumps); unknown placeholders are rejected', async () => {
    const id = await templateId('follow_up', t.world.a.admin.headers)
    await call(t.app, 'updateEmailTemplate', { method: 'PATCH', url: `/email/templates/${id}`, headers: t.world.a.member.headers, payload: { label: 'x' } }, 403)
    await call(t.app, 'updateEmailTemplate', { method: 'PATCH', url: `/email/templates/${id}`, headers: t.world.a.admin.headers, payload: { bodyTemplate: 'Hi {{contact.ssn}}' } }, 422)
    const upd = await call(t.app, 'updateEmailTemplate', { method: 'PATCH', url: `/email/templates/${id}`, headers: t.world.a.admin.headers, payload: { subjectTemplate: 'Checking in, {{contact.firstName}}' } }, 200)
    expect(upd.data.version).toBe(2)
  })
})

describe('renderEmail', () => {
  it('requires auth', async () => {
    await call(t.app, 'renderEmail', { method: 'POST', url: '/email/render', payload: { templateId: 'x', contactId: 'x' } }, 401)
  })
  it('fills from real records and reports unknown values instead of inventing them', async () => {
    const { contact, job } = await makeJob(t.app, t.world.a.member.headers)
    const r = await call(t.app, 'renderEmail', {
      method: 'POST',
      url: '/email/render',
      headers: t.world.a.member.headers,
      payload: { templateId: await templateId('inspection_confirmation'), contactId: contact.id, opportunityId: job.id },
    }, 200)
    expect(r.data.body).toContain('Hi Don,')
    expect(r.data.unresolved).toEqual(expect.arrayContaining(['appointment.date', 'appointment.time']))
    expect(r.data.sender).toMatchObject({ provider: 'DEV_LOG', verified: true })
    expect(r.data.to.email).toBe(contact.email)
  })
  it('cannot render for another company’s contact', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'renderEmail', { method: 'POST', url: '/email/render', headers: t.world.b.owner.headers, payload: { templateId: await templateId('welcome', t.world.b.owner.headers), contactId: contact.id } }, 404)
  })
})

describe('sendEmail', () => {
  it('requires auth', async () => {
    await call(t.app, 'sendEmail', { method: 'POST', url: '/email/messages', payload: { contactId: 'x', subject: 's', body: 'b', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('queues once per idempotency key, then the worker sends and (dev) delivery is recorded on one river item', async () => {
    const { contact, job } = await makeJob(t.app, t.world.a.member.headers)
    const k = key()
    const payload = { templateId: await templateId('welcome'), contactId: contact.id, opportunityId: job.id, subject: 'Thanks for contacting Acme', body: 'Hi Don, thanks!', idempotencyKey: k }
    const [a, b] = await Promise.all([
      t.app.inject({ method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload }),
      t.app.inject({ method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload }),
    ])
    expect(a.json().data.id).toBe(b.json().data.id)
    expect(a.json().data.status).toBe('QUEUED')
    expect(await db.outboundMessage.count({ where: { opportunityId: job.id } })).toBe(1)

    await processBatch()
    const delivered = await waitFor(() => db.outboundMessage.findUniqueOrThrow({ where: { id: a.json().data.id } }), (m) => m.status === 'DELIVERED')
    expect(delivered.providerMessageId).toMatch(/^dev_/)
    const feed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}&filter=messages`, headers: t.world.a.member.headers }, 200)
    expect(feed.data).toHaveLength(1)
    expect(feed.data[0].message.status).toBe('DELIVERED')
    const contactDetail = await call(t.app, 'getContact', { method: 'GET', url: `/contacts/${contact.id}`, headers: t.world.a.member.headers }, 200)
    expect(contactDetail.data.recentEmails[0].id).toBe(a.json().data.id)
  })
  it('blocks sending while placeholders are unresolved or the contact has no email', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'sendEmail', { method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload: { contactId: contact.id, subject: 'Hi', body: 'See you {{appointment.date}}', idempotencyKey: key() } }, 422)
    const noEmail = await makeJob(t.app, t.world.a.member.headers, { name: 'No Email', email: null })
    await call(t.app, 'sendEmail', { method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload: { contactId: noEmail.contact.id, subject: 'Hi', body: 'Hello', idempotencyKey: key() } }, 422)
  })
  it('a review request is tracked separately and stays UNKNOWN after delivery', async () => {
    const { contact, job } = await makeJob(t.app, t.world.a.member.headers)
    const sent = await call(t.app, 'sendEmail', {
      method: 'POST',
      url: '/email/messages',
      headers: t.world.a.member.headers,
      payload: { templateId: await templateId('review_request'), contactId: contact.id, opportunityId: job.id, subject: 'How did we do?', body: 'Please review: https://g.page/r/test-review', idempotencyKey: key() },
    }, 202)
    expect(sent.data.reviewRequestId).toBeTruthy()
    await processBatch()
    await waitFor(() => db.outboundMessage.findUniqueOrThrow({ where: { id: sent.data.id } }), (m) => m.status === 'DELIVERED')
    const detail = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(detail.data.reviewRequests[0]).toMatchObject({ reviewStatus: 'UNKNOWN', latestMessage: { status: 'DELIVERED' } })
    expect(detail.data.stageId).toBe('lead') // sending never advances the stage
  })
  it('a simulated bounce marks the message BOUNCED', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers, { email: 'nobody@bounce.test' })
    const sent = await call(t.app, 'sendEmail', { method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload: { contactId: contact.id, subject: 'Hi', body: 'Hello', idempotencyKey: key() } }, 202)
    await processBatch()
    const m = await waitFor(() => db.outboundMessage.findUniqueOrThrow({ where: { id: sent.data.id } }), (x) => x.status === 'BOUNCED')
    expect(m.lastError).toMatch(/Simulated/)
  })
})

describe('listMessages', () => {
  it('requires auth', async () => {
    await call(t.app, 'listMessages', { method: 'GET', url: '/email/messages' }, 401)
  })
  it('never lists another company’s messages', async () => {
    const body = await call(t.app, 'listMessages', { method: 'GET', url: '/email/messages', headers: t.world.b.owner.headers }, 200)
    expect(body.data).toHaveLength(0)
  })
})

describe('getMessage', () => {
  it('requires auth', async () => {
    await call(t.app, 'getMessage', { method: 'GET', url: '/email/messages/x' }, 401)
  })
  it('shows the frozen content and attempts', async () => {
    const [m] = await db.outboundMessage.findMany({ where: { organizationId: t.world.a.org.id }, take: 1 })
    const body = await call(t.app, 'getMessage', { method: 'GET', url: `/email/messages/${m!.id}`, headers: t.world.a.member.headers }, 200)
    expect(body.data.attempts.length).toBeGreaterThan(0)
    await call(t.app, 'getMessage', { method: 'GET', url: `/email/messages/${m!.id}`, headers: t.world.b.owner.headers }, 404)
  })
})

describe('retryMessage', () => {
  it('requires auth', async () => {
    await call(t.app, 'retryMessage', { method: 'POST', url: '/email/messages/x/retry' }, 401)
  })
  it('a permanent failure is shown as FAILED and can be explicitly retried', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers, { email: 'reject@fail.test' })
    const sent = await call(t.app, 'sendEmail', { method: 'POST', url: '/email/messages', headers: t.world.a.member.headers, payload: { contactId: contact.id, subject: 'Hi', body: 'Hello', idempotencyKey: key() } }, 202)
    await processBatch()
    const failed = await db.outboundMessage.findUniqueOrThrow({ where: { id: sent.data.id } })
    expect(failed.status).toBe('FAILED')
    const runs = await call(t.app, 'listWorkerRuns', { method: 'GET', url: '/diagnostics/worker-runs', headers: t.world.a.admin.headers }, 200)
    expect(runs.data.some((r: any) => r.status === 'PARTIALLY_COMPLETED')).toBe(true)
    const retried = await call(t.app, 'retryMessage', { method: 'POST', url: `/email/messages/${sent.data.id}/retry`, headers: t.world.a.member.headers }, 202)
    expect(retried.data.status).toBe('QUEUED')
    await call(t.app, 'retryMessage', { method: 'POST', url: `/email/messages/${sent.data.id}/retry`, headers: t.world.a.member.headers }, 409)
  })
})

describe('listSenders', () => {
  it('requires auth', async () => {
    await call(t.app, 'listSenders', { method: 'GET', url: '/email/senders' }, 401)
  })
  it('never returns credentials', async () => {
    await db.senderIdentity.create({ data: { organizationId: t.world.a.org.id, provider: 'RESEND', fromName: 'Acme', fromEmail: 'hi@acme.test', credentialCiphertext: encryptSecret('re_secret_key') } })
    const res = await t.app.inject({ method: 'GET', url: '/email/senders', headers: t.world.a.member.headers })
    expect(res.body).not.toContain('re_secret_key')
    expect(res.body).not.toContain('credentialCiphertext')
    expect(res.json().data.find((s: any) => s.provider === 'RESEND').hasCredential).toBe(true)
  })
})

describe('createSender', () => {
  it('requires auth', async () => {
    await call(t.app, 'createSender', { method: 'POST', url: '/email/senders', payload: { provider: 'DEV_LOG', fromName: 'x', fromEmail: 'x@y.co' } }, 401)
  })
  it('is admin-only', async () => {
    await call(t.app, 'createSender', { method: 'POST', url: '/email/senders', headers: t.world.a.manager.headers, payload: { provider: 'DEV_LOG', fromName: 'x', fromEmail: 'x@y.co' } }, 403)
  })
  it('requires a key for Resend', async () => {
    await call(t.app, 'createSender', { method: 'POST', url: '/email/senders', headers: t.world.b.owner.headers, payload: { provider: 'RESEND', fromName: 'Other', fromEmail: 'hi@other.test' } }, 422)
  })
})

describe('deleteSender', () => {
  it('requires auth', async () => {
    await call(t.app, 'deleteSender', { method: 'DELETE', url: '/email/senders/x' }, 401)
  })
  it('cannot delete another company’s sender', async () => {
    const s = await db.senderIdentity.findFirstOrThrow({ where: { organizationId: t.world.a.org.id, provider: 'RESEND' } })
    await call(t.app, 'deleteSender', { method: 'DELETE', url: `/email/senders/${s.id}`, headers: t.world.b.owner.headers }, 404)
    await call(t.app, 'deleteSender', { method: 'DELETE', url: `/email/senders/${s.id}`, headers: t.world.a.admin.headers }, 200)
  })
})

describe('verifySender', () => {
  it('requires auth', async () => {
    await call(t.app, 'verifySender', { method: 'POST', url: '/email/senders/x/verify' }, 401)
  })
  it('the development sender is reported as verified', async () => {
    const dev = await db.senderIdentity.findFirstOrThrow({ where: { organizationId: t.world.a.org.id, provider: 'DEV_LOG' } })
    const body = await call(t.app, 'verifySender', { method: 'POST', url: `/email/senders/${dev.id}/verify`, headers: t.world.a.admin.headers }, 200)
    expect(body.data.verification).toBe('VERIFIED')
  })
})

describe('receiveResendWebhook', () => {
  it('rejects unsigned or tampered payloads', async () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'x' } })
    const headers = signSvix(body, 'msg_bad')
    await call(t.app, 'receiveResendWebhook', { method: 'POST', url: '/webhooks/email/resend', headers: { 'content-type': 'application/json' }, payload: body }, 401)
    await call(t.app, 'receiveResendWebhook', { method: 'POST', url: '/webhooks/email/resend', headers, payload: body.replace('delivered', 'bounced') }, 401)
  })
  it('applies signed delivery events once and never moves a message backwards', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    const m = await db.outboundMessage.create({
      data: {
        organizationId: t.world.a.org.id, contactId: contact.id, senderIdentityId: (await db.senderIdentity.findFirstOrThrow({ where: { organizationId: t.world.a.org.id } })).id,
        provider: 'RESEND', fromSnapshot: 'Acme <hi@acme.test>', toEmail: contact.email, subject: 's', bodyText: 'b', idempotencyKey: key(), requestedById: t.world.a.member.id,
        status: 'SENT', sentAt: new Date(), providerMessageId: 're_123',
      },
    })
    const delivered = JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 're_123' } })
    for (let i = 0; i < 2; i++) {
      await call(t.app, 'receiveResendWebhook', { method: 'POST', url: '/webhooks/email/resend', headers: signSvix(delivered, 'evt_1'), payload: delivered }, 200)
    }
    expect(await db.emailProviderEvent.count({ where: { providerEventId: 'evt_1' } })).toBe(1)
    const lateSent = JSON.stringify({ type: 'email.sent', created_at: new Date().toISOString(), data: { email_id: 're_123' } })
    await call(t.app, 'receiveResendWebhook', { method: 'POST', url: '/webhooks/email/resend', headers: signSvix(lateSent, 'evt_2'), payload: lateSent }, 200)
    expect((await db.outboundMessage.findUniqueOrThrow({ where: { id: m.id } })).status).toBe('DELIVERED')
  })
})
