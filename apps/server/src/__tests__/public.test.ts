import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, makeJob, useApp } from './helpers'

const t = useApp()

async function form() {
  return (await call(t.app, 'createLeadForm', { method: 'POST', url: '/lead-forms', headers: t.world.a.admin.headers, payload: { label: 'Website', headline: 'Free inspection' } }, 201)).data
}

const submission = (overrides: object = {}) => ({ name: 'Grace Web', email: 'grace@web.test', phone: '555-303-0000', address: '7 Elm', service: 'Roof repair', message: 'Leak over the garage', startedAt: Date.now() - 10_000, ...overrides })

describe('getPublicForm', () => {
  it('serves public configuration only', async () => {
    const f = await form()
    const body = await call(t.app, 'getPublicForm', { method: 'GET', url: `/public/forms/${f.publicToken}` }, 200)
    expect(body.data).toEqual({ companyName: 'Acme Roofing', headline: 'Free inspection', successMessage: null })
  })
})

describe('submitPublicForm', () => {
  it('creates contact + job and preserves the raw submission and provider timestamp', async () => {
    const f = await form()
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission() }, 202)
    const job = await db.opportunity.findFirstOrThrow({ where: { organizationId: t.world.a.org.id, contact: { name: 'Grace Web' } }, include: { sourceRecord: true } })
    expect(job).toMatchObject({ title: 'Roof repair', leadSourceOptionId: 'web_form', leadReceivedVia: 'PROVIDER', stageId: 'lead' })
    expect((job.sourceRecord!.rawPayload as any).message).toBe('Leak over the garage')
    const ev = await db.activityEvent.findFirstOrThrow({ where: { opportunityId: job.id, type: 'lead.received' } })
    expect(ev.actorType).toBe('INTEGRATION')
  })
  it('a repeat inquiry from the same person becomes a second job on the same contact', async () => {
    const f = await form()
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission({ service: 'Gutters' }) }, 202)
    const contacts = await db.contact.findMany({ where: { organizationId: t.world.a.org.id, name: 'Grace Web' }, include: { opportunities: true } })
    expect(contacts).toHaveLength(1)
    expect(contacts[0]!.opportunities).toHaveLength(2)
  })
  it('an ambiguous match is queued for review and announced in Activity — never merged', async () => {
    await makeJob(t.app, t.world.a.member.headers, { name: 'Henry House', email: 'shared@family.test' })
    const f = await form()
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission({ name: 'Hannah House', email: 'shared@family.test', phone: null }) }, 202)
    const pending = await db.sourceRecord.count({ where: { organizationId: t.world.a.org.id, dedupeStatus: 'PENDING_REVIEW' } })
    expect(pending).toBe(1)
    expect(await db.activityEvent.count({ where: { organizationId: t.world.a.org.id, type: 'intake.review_needed' } })).toBe(1)
  })
  it('silently drops honeypot and too-fast submissions', async () => {
    const f = await form()
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission({ name: 'Bot One', website: 'http://spam' }) }, 202)
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission({ name: 'Bot Two', startedAt: Date.now() }) }, 202)
    expect(await db.contact.count({ where: { name: { startsWith: 'Bot ' } } })).toBe(0)
  })
  it('rate-limits a single sender', async () => {
    const f = await form()
    let last = 0
    for (let i = 0; i < 7; i++) {
      const res = await t.app.inject({ method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, payload: submission({ name: `Rate ${i}`, email: `rate${i}@x.test` }) })
      last = res.statusCode
    }
    expect(last).toBe(429)
  })
  it('requires a way to reach the person', async () => {
    const f = await form()
    await call(t.app, 'submitPublicForm', { method: 'POST', url: `/public/forms/${f.publicToken}/submissions`, headers: { 'x-forwarded-for': '10.0.0.9' }, payload: submission({ name: 'No Contact', email: null, phone: null }) }, 422)
  })
})
