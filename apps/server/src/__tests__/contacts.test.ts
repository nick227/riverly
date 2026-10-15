import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, makeJob, useApp } from './helpers'

const t = useApp()

describe('listContacts', () => {
  it('requires auth', async () => {
    await call(t.app, 'listContacts', { method: 'GET', url: '/contacts' }, 401)
  })
  it('searches by name, email and phone digits within the company only', async () => {
    await makeJob(t.app, t.world.a.member.headers, { name: 'Maria Santos', phone: '555-222-3333' })
    await makeJob(t.app, t.world.b.owner.headers, { name: 'Maria Other' })
    const byName = await call(t.app, 'listContacts', { method: 'GET', url: '/contacts?q=maria', headers: t.world.a.member.headers }, 200)
    expect(byName.data.map((c: any) => c.name)).toEqual(['Maria Santos'])
    expect(byName.data[0].sourceNames).toContain('Manual entry')
    const byPhone = await call(t.app, 'listContacts', { method: 'GET', url: '/contacts?q=2223333', headers: t.world.a.member.headers }, 200)
    expect(byPhone.data).toHaveLength(1)
  })
  it('paginates with an opaque cursor', async () => {
    for (let i = 0; i < 3; i++) await makeJob(t.app, t.world.a.member.headers, { name: `Page ${i}` })
    const p1 = await call(t.app, 'listContacts', { method: 'GET', url: '/contacts?limit=2', headers: t.world.a.member.headers }, 200)
    expect(p1.meta.hasMore).toBe(true)
    const p2 = await call(t.app, 'listContacts', { method: 'GET', url: `/contacts?limit=2&cursor=${p1.meta.nextCursor}`, headers: t.world.a.member.headers }, 200)
    expect(p2.data[0].id).not.toBe(p1.data[1].id)
  })
})

describe('createContact', () => {
  it('requires auth', async () => {
    await call(t.app, 'createContact', { method: 'POST', url: '/contacts', payload: { name: 'X' } }, 401)
  })
  it('creates contact + first job with MANUAL provenance and a lead.received event', async () => {
    const { contact, job } = await makeJob(t.app, t.world.a.member.headers)
    expect(contact.sources[0]).toMatchObject({ kind: 'MANUAL', matchedBy: 'created' })
    expect(job.stageId).toBe('lead')
    const events = await db.activityEvent.findMany({ where: { opportunityId: job.id } })
    expect(events.map((e) => e.type)).toEqual(['lead.received'])
  })
  it('records a manually entered lead time with MANUAL provenance', async () => {
    const when = new Date(Date.now() - 3 * 3600_000).toISOString()
    const { job } = await makeJob(t.app, t.world.a.member.headers, { job: { title: 'Repair', leadReceivedAt: when } })
    const row = await db.opportunity.findUniqueOrThrow({ where: { id: job.id } })
    expect(row.leadReceivedVia).toBe('MANUAL')
    expect(row.leadReceivedAt.toISOString()).toBe(when)
  })
  it('rejects an option ID that is not configured', async () => {
    await call(t.app, 'createContact', { method: 'POST', url: '/contacts', headers: t.world.a.member.headers, payload: { name: 'Bad', job: { title: 'X', leadSourceOptionId: 'tv_ad' } } }, 422)
  })
  it('cannot assign a job to someone outside the company', async () => {
    await call(t.app, 'createContact', { method: 'POST', url: '/contacts', headers: t.world.a.member.headers, payload: { name: 'Bad', job: { title: 'X', ownerId: t.world.b.owner.id } } }, 422)
  })
})

describe('matchContacts', () => {
  it('requires auth', async () => {
    await call(t.app, 'matchContacts', { method: 'POST', url: '/contacts/match', payload: {} }, 401)
  })
  it('suggests matches on normalized email and phone, never across companies', async () => {
    await makeJob(t.app, t.world.a.member.headers, { name: 'Robert Hale', email: 'rob@hale.test', phone: '+1 (555) 444-0000' })
    const body = await call(t.app, 'matchContacts', { method: 'POST', url: '/contacts/match', headers: t.world.a.member.headers, payload: { email: ' ROB@hale.test ', phone: '5554440000' } }, 200)
    expect(body.data[0].matchedOn).toEqual(['email', 'phone'])
    const other = await call(t.app, 'matchContacts', { method: 'POST', url: '/contacts/match', headers: t.world.b.owner.headers, payload: { email: 'rob@hale.test' } }, 200)
    expect(other.data).toHaveLength(0)
  })
})

describe('getContact', () => {
  it('requires auth', async () => {
    await call(t.app, 'getContact', { method: 'GET', url: '/contacts/x' }, 401)
  })
  it('returns 404 for another company’s contact (no ID probing)', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'getContact', { method: 'GET', url: `/contacts/${contact.id}`, headers: t.world.b.owner.headers }, 404)
    await call(t.app, 'getContact', { method: 'GET', url: `/contacts/${contact.id}`, headers: t.world.a.manager.headers }, 200)
  })
})

describe('updateContact', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateContact', { method: 'PATCH', url: '/contacts/x', payload: {} }, 401)
  })
  it('updates person details for every job and logs the change', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'createOpportunity', { method: 'POST', url: `/contacts/${contact.id}/opportunities`, headers: t.world.a.member.headers, payload: { title: 'Gutters' } }, 201)
    const body = await call(t.app, 'updateContact', { method: 'PATCH', url: `/contacts/${contact.id}`, headers: t.world.a.member.headers, payload: { phone: '555 999 0000' } }, 200)
    expect(body.data.phone).toBe('555 999 0000')
    const e = await db.activityEvent.findFirstOrThrow({ where: { contactId: contact.id, type: 'contact.updated' } })
    expect((e.payload as any).changes[0].field).toBe('phone')
  })
  it('cannot edit another company’s contact', async () => {
    const { contact } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'updateContact', { method: 'PATCH', url: `/contacts/${contact.id}`, headers: t.world.b.owner.headers, payload: { name: 'Hijack' } }, 404)
  })
})
