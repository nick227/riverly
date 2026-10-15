import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

describe('createOpportunity', () => {
  it('requires auth', async () => {
    await call(t.app, 'createOpportunity', { method: 'POST', url: '/contacts/x/opportunities', payload: { title: 'X' } }, 401)
  })
  it('adds an independent second job without touching the first', async () => {
    const { contact, job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'called', idempotencyKey: key() } }, 200)
    const second = await call(t.app, 'createOpportunity', { method: 'POST', url: `/contacts/${contact.id}/opportunities`, headers: t.world.a.member.headers, payload: { title: 'Gutter repair' } }, 201)
    expect(second.data.stageId).toBe('lead')
    const first = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(first.data.stageId).toBe('called')
    expect(first.data.otherJobs.map((j: any) => j.id)).toEqual([second.data.id])
  })
})

describe('listOpportunities', () => {
  it('requires auth', async () => {
    await call(t.app, 'listOpportunities', { method: 'GET', url: '/opportunities' }, 401)
  })
  it('filters by stage/owner and returns stage counts', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers, { name: 'Filter Me', job: { title: 'Roof', ownerId: t.world.a.member.id } })
    const mine = await call(t.app, 'listOpportunities', { method: 'GET', url: '/opportunities?ownerId=me', headers: t.world.a.member.headers }, 200)
    expect(mine.data.map((j: any) => j.id)).toContain(job.id)
    const unassigned = await call(t.app, 'listOpportunities', { method: 'GET', url: '/opportunities?ownerId=none', headers: t.world.a.member.headers }, 200)
    expect(unassigned.data.map((j: any) => j.id)).not.toContain(job.id)
    expect(mine.meta.stageCounts.lead).toBeGreaterThan(0)
    const other = await call(t.app, 'listOpportunities', { method: 'GET', url: '/opportunities', headers: t.world.b.owner.headers }, 200)
    expect(other.data.map((j: any) => j.id)).not.toContain(job.id)
  })
})

describe('getOpportunity', () => {
  it('requires auth', async () => {
    await call(t.app, 'getOpportunity', { method: 'GET', url: '/opportunities/x' }, 401)
  })
  it('is invisible to another company', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.b.owner.headers }, 404)
  })
})

describe('updateOpportunity', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: '/opportunities/x', payload: {} }, 401)
  })
  it('lets a member claim an unassigned job but not reassign it', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers, payload: { ownerId: t.world.a.member.id } }, 200)
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers, payload: { ownerId: t.world.a.manager.id } }, 403)
  })
  it('keeps current owner and every historical assignment event', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.manager.headers, payload: { ownerId: t.world.a.member.id } }, 200)
    const body = await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.manager.headers, payload: { ownerId: t.world.a.admin.id } }, 200)
    expect(body.data.owner.id).toBe(t.world.a.admin.id)
    const events = await db.activityEvent.findMany({ where: { opportunityId: job.id, type: 'assignment.changed' }, orderBy: { occurredAt: 'asc' } })
    expect(events.map((e) => (e.payload as any).toOwnerId)).toEqual([t.world.a.member.id, t.world.a.admin.id])
  })
  it('logs native field edits with stable field IDs', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers, payload: { urgencyOptionId: 'asap', estimatedValueCents: 1_250_000 } }, 200)
    const e = await db.activityEvent.findFirstOrThrow({ where: { opportunityId: job.id, type: 'job.updated' } })
    expect((e.payload as any).changes.map((c: any) => c.fieldId).sort()).toEqual(['estimate', 'urgency'])
  })
})

describe('setOpportunityField', () => {
  it('requires auth', async () => {
    await call(t.app, 'setOpportunityField', { method: 'PUT', url: '/opportunities/x/fields/interest', payload: { value: 'x' } }, 401)
  })
  it('stores a validated custom select value and logs it', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'setOpportunityField', { method: 'PUT', url: `/opportunities/${job.id}/fields/interest`, headers: t.world.a.member.headers, payload: { value: 'interested' } }, 200)
    await call(t.app, 'setOpportunityField', { method: 'PUT', url: `/opportunities/${job.id}/fields/interest`, headers: t.world.a.member.headers, payload: { value: 'bogus' } }, 422)
    const detail = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(detail.data.fieldValues.interest).toBe('interested')
  })
  it('refuses native-bound and domain-control fields', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'setOpportunityField', { method: 'PUT', url: `/opportunities/${job.id}/fields/urgency`, headers: t.world.a.member.headers, payload: { value: 'asap' } }, 422)
    await call(t.app, 'setOpportunityField', { method: 'PUT', url: `/opportunities/${job.id}/fields/contact_log`, headers: t.world.a.member.headers, payload: { value: 'x' } }, 422)
  })
})

describe('transitionOpportunity', () => {
  it('requires auth', async () => {
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: '/opportunities/x/transitions', payload: { toStageId: 'called', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('moves forward with empty optional fields and back again, logging both', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const fwd = await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'contract', idempotencyKey: key() } }, 200)
    expect(fwd.data.kind).toBe('FORWARD')
    const back = await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'called', reason: 'Customer wants a second inspection', idempotencyKey: key() } }, 200)
    expect(back.data.kind).toBe('BACKWARD')
    const types = await db.activityEvent.findMany({ where: { opportunityId: job.id, type: 'stage.changed' } })
    expect(types).toHaveLength(2)
  })
  it('a retried request with the same key creates exactly one transition and event', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const k = key()
    const req = { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'called', idempotencyKey: k } }
    const [a, b] = await Promise.all([t.app.inject(req as any), t.app.inject(req as any)])
    const ids = [a, b].filter((r) => r.statusCode === 200).map((r) => r.json().data.id)
    expect(new Set(ids).size).toBe(1)
    expect(await db.stageTransition.count({ where: { opportunityId: job.id, kind: { not: 'STATUS' }, fromStageId: { not: null } } })).toBe(1)
    expect(await db.activityEvent.count({ where: { opportunityId: job.id, type: 'stage.changed' } })).toBe(1)
  })
  it('rejects unknown stages and moves into the current stage', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'nope', idempotencyKey: key() } }, 422)
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'lead', idempotencyKey: key() } }, 422)
  })
})

describe('setOpportunityStatus', () => {
  it('requires auth', async () => {
    await call(t.app, 'setOpportunityStatus', { method: 'POST', url: '/opportunities/x/status', payload: { status: 'LOST', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('requires a reason for lost and keeps the stage', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'setOpportunityStatus', { method: 'POST', url: `/opportunities/${job.id}/status`, headers: t.world.a.member.headers, payload: { status: 'LOST', idempotencyKey: key() } }, 422)
    const body = await call(t.app, 'setOpportunityStatus', { method: 'POST', url: `/opportunities/${job.id}/status`, headers: t.world.a.member.headers, payload: { status: 'LOST', reason: 'Went with a competitor', idempotencyKey: key() } }, 200)
    expect(body.data).toMatchObject({ kind: 'STATUS', fromStatus: 'OPEN', toStatus: 'LOST', toStageId: 'lead' })
    await call(t.app, 'setOpportunityStatus', { method: 'POST', url: `/opportunities/${job.id}/status`, headers: t.world.a.member.headers, payload: { status: 'OPEN', idempotencyKey: key() } }, 200)
  })
})
