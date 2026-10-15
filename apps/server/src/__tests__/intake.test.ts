import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, makeJob, useApp } from './helpers'

const t = useApp()

const CSV = `Full Name,Email,Phone,Street Address,Service,Lead Date
Angela Ruiz,angela@ruiz.test,555-100-2000,12 Oak St,Roof replacement,2026-09-01
Tom Becker,tom@becker.test,555-100-3000,99 Pine Rd,Repair,2026-09-03
,missing@name.test,,,
`

describe('listSources', () => {
  it('requires auth', async () => {
    await call(t.app, 'listSources', { method: 'GET', url: '/sources' }, 401)
  })
})

describe('previewImport', () => {
  it('requires auth', async () => {
    await call(t.app, 'previewImport', { method: 'POST', url: '/imports/preview', payload: { fileName: 'a.csv', csv: 'a' } }, 401)
  })
  it('suggests a column mapping', async () => {
    const body = await call(t.app, 'previewImport', { method: 'POST', url: '/imports/preview', headers: t.world.a.manager.headers, payload: { fileName: 'leads.csv', csv: CSV } }, 200)
    expect(body.data.suggestedMapping).toMatchObject({ name: 'Full Name', email: 'Email', phone: 'Phone', addressLine: 'Street Address', jobTitle: 'Service', receivedAt: 'Lead Date' })
    expect(body.data.rowCount).toBe(3)
  })
  it('is limited to managers', async () => {
    await call(t.app, 'previewImport', { method: 'POST', url: '/imports/preview', headers: t.world.a.member.headers, payload: { fileName: 'leads.csv', csv: CSV } }, 403)
  })
})

describe('runImport', () => {
  it('requires auth', async () => {
    await call(t.app, 'runImport', { method: 'POST', url: '/imports', payload: { fileName: 'a.csv', csv: 'a' } }, 401)
  })
  it('imports rows with provenance, flags bad rows and is replay-safe', async () => {
    const run = await call(t.app, 'runImport', { method: 'POST', url: '/imports', headers: t.world.a.manager.headers, payload: { fileName: 'leads.csv', csv: CSV, createJobs: true } }, 201)
    expect(run.data).toMatchObject({ state: 'PARTIALLY_COMPLETED', created: 2, errors: 1 })
    expect(run.data.issues[0].rowNumber).toBe(4)
    const job = await db.opportunity.findFirstOrThrow({ where: { organizationId: t.world.a.org.id, contact: { name: 'Angela Ruiz' } } })
    expect(job.leadReceivedVia).toBe('IMPORTED')
    expect(job.leadReceivedAt.toISOString().slice(0, 10)).toBe('2026-09-01')
    const replay = await call(t.app, 'runImport', { method: 'POST', url: '/imports', headers: t.world.a.manager.headers, payload: { fileName: 'leads.csv', csv: CSV, createJobs: true } }, 201)
    expect(replay.data.created).toBe(0)
    expect(await db.contact.count({ where: { organizationId: t.world.a.org.id, name: 'Angela Ruiz' } })).toBe(1)
    const events = await db.activityEvent.count({ where: { organizationId: t.world.a.org.id, type: 'import.completed' } })
    expect(events).toBe(2)
  })
  it('sends a phone-only collision to review instead of merging', async () => {
    await makeJob(t.app, t.world.a.member.headers, { name: 'Robin Shared', email: 'robin@a.test', phone: '555-777-0000' })
    const csv = 'Name,Email,Phone\nRobin Partner,partner@b.test,555-777-0000\n'
    const run = await call(t.app, 'runImport', { method: 'POST', url: '/imports', headers: t.world.a.manager.headers, payload: { fileName: 'shared.csv', csv } }, 201)
    expect(run.data.duplicatesFlagged).toBe(1)
    expect(await db.contact.count({ where: { organizationId: t.world.a.org.id, name: 'Robin Partner' } })).toBe(0)
  })
})

describe('listImports', () => {
  it('requires auth', async () => {
    await call(t.app, 'listImports', { method: 'GET', url: '/imports' }, 401)
  })
  it('lists only this company’s runs', async () => {
    const body = await call(t.app, 'listImports', { method: 'GET', url: '/imports', headers: t.world.b.owner.headers }, 200)
    expect(body.data).toHaveLength(0)
  })
})

describe('listReviewQueue', () => {
  it('requires auth', async () => {
    await call(t.app, 'listReviewQueue', { method: 'GET', url: '/intake/review' }, 401)
  })
})

describe('resolveReviewItem', () => {
  it('requires auth', async () => {
    await call(t.app, 'resolveReviewItem', { method: 'POST', url: '/intake/review/x', payload: { action: 'reject' } }, 401)
  })
  it('links a reviewed submission to an existing contact as a new job, preserving the original record', async () => {
    const queue = await call(t.app, 'listReviewQueue', { method: 'GET', url: '/intake/review', headers: t.world.a.member.headers }, 200)
    const item = queue.data.find((i: any) => i.proposed.name === 'Robin Partner')
    expect(item.candidates[0].matchedOn).toEqual(['phone'])
    await call(t.app, 'resolveReviewItem', { method: 'POST', url: `/intake/review/${item.sourceRecordId}`, headers: t.world.b.owner.headers, payload: { action: 'reject' } }, 404)
    const res = await call(t.app, 'resolveReviewItem', { method: 'POST', url: `/intake/review/${item.sourceRecordId}`, headers: t.world.a.member.headers, payload: { action: 'link', contactId: item.candidates[0].contact.id, createJob: true } }, 200)
    expect(res.data.opportunityId).toBeTruthy()
    const contact = await call(t.app, 'getContact', { method: 'GET', url: `/contacts/${res.data.contactId}`, headers: t.world.a.member.headers }, 200)
    expect(contact.data.sources.map((s: any) => s.matchedBy)).toEqual(['created', 'manual'])
    const raw = await db.sourceRecord.findUniqueOrThrow({ where: { id: item.sourceRecordId } })
    expect((raw.rawPayload as any).Name).toBe('Robin Partner')
    await call(t.app, 'resolveReviewItem', { method: 'POST', url: `/intake/review/${item.sourceRecordId}`, headers: t.world.a.member.headers, payload: { action: 'reject' } }, 409)
  })
})

describe('listLeadForms', () => {
  it('requires auth', async () => {
    await call(t.app, 'listLeadForms', { method: 'GET', url: '/lead-forms' }, 401)
  })
})

describe('createLeadForm', () => {
  it('requires auth', async () => {
    await call(t.app, 'createLeadForm', { method: 'POST', url: '/lead-forms', payload: { label: 'x' } }, 401)
  })
  it('is admin-only and returns a public token', async () => {
    await call(t.app, 'createLeadForm', { method: 'POST', url: '/lead-forms', headers: t.world.a.manager.headers, payload: { label: 'Site form' } }, 403)
    const body = await call(t.app, 'createLeadForm', { method: 'POST', url: '/lead-forms', headers: t.world.a.admin.headers, payload: { label: 'Site form', headline: 'Get a free inspection' } }, 201)
    expect(body.data.publicToken.length).toBeGreaterThan(16)
  })
})

describe('updateLeadForm', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateLeadForm', { method: 'PATCH', url: '/lead-forms/x', payload: {} }, 401)
  })
  it('can disable a form', async () => {
    const f = await call(t.app, 'createLeadForm', { method: 'POST', url: '/lead-forms', headers: t.world.a.admin.headers, payload: { label: 'Old form' } }, 201)
    await call(t.app, 'updateLeadForm', { method: 'PATCH', url: `/lead-forms/${f.data.id}`, headers: t.world.b.owner.headers, payload: { isActive: false } }, 404)
    await call(t.app, 'updateLeadForm', { method: 'PATCH', url: `/lead-forms/${f.data.id}`, headers: t.world.a.admin.headers, payload: { isActive: false } }, 200)
    await call(t.app, 'getPublicForm', { method: 'GET', url: `/public/forms/${f.data.publicToken}` }, 404)
  })
})
