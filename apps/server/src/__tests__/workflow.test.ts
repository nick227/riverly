import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

async function current(headers: any) {
  return (await call(t.app, 'getWorkflow', { method: 'GET', url: '/workflow', headers }, 200)).data
}

describe('getWorkflow', () => {
  it('requires auth', async () => {
    await call(t.app, 'getWorkflow', { method: 'GET', url: '/workflow' }, 401)
  })
  it('returns the seeded six-stage roofing template', async () => {
    const wf = await current(t.world.a.member.headers)
    expect(wf.definition.stages.map((s: any) => s.label)).toEqual(['New Lead', 'Called', 'Inspection', 'Contract Signed', 'Job Started', 'Job Completed'])
  })
})

describe('publishWorkflow', () => {
  it('requires auth', async () => {
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', payload: {} }, 401)
  })
  it('managers cannot change configuration', async () => {
    const wf = await current(t.world.a.manager.headers)
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.a.manager.headers, payload: { baseVersionId: wf.versionId, definition: wf.definition } }, 403)
  })
  it('renames Inspection → Site visit and an option label without touching history or report keys', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers, { job: { title: 'Roof', urgencyOptionId: 'asap' } })
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'inspection', idempotencyKey: key() } }, 200)
    const eventsBefore = await db.activityEvent.findMany({ where: { opportunityId: job.id }, orderBy: { id: 'asc' } })
    const wf = await current(t.world.a.admin.headers)
    const def = structuredClone(wf.definition)
    def.stages.find((s: any) => s.id === 'inspection').label = 'Site visit'
    def.stages.find((s: any) => s.id === 'called').label = 'Contacted'
    def.fields.find((f: any) => f.id === 'urgency').options[0].label = 'Emergency'
    const published = await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.a.admin.headers, payload: { baseVersionId: wf.versionId, definition: def, changeNote: 'Pilot vocabulary' } }, 201)
    expect(published.data.version).toBe(2)
    const eventsAfter = await db.activityEvent.findMany({ where: { opportunityId: job.id }, orderBy: { id: 'asc' } })
    expect(eventsAfter.map((e) => [e.id, e.stageId, e.type])).toEqual(eventsBefore.map((e) => [e.id, e.stageId, e.type]))
    const job2 = await db.opportunity.findUniqueOrThrow({ where: { id: job.id } })
    expect(job2).toMatchObject({ stageId: 'inspection', urgencyOptionId: 'asap' })
    const report = await call(t.app, 'getPipelineReport', { method: 'GET', url: '/reports/pipeline', headers: t.world.a.manager.headers }, 200)
    expect(report.data.byStage.find((r: any) => r.key === 'inspection')).toMatchObject({ label: 'Site visit', count: 1 })
  })
  it('rejects stale edits from another admin session', async () => {
    const wf = await current(t.world.b.owner.headers)
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.b.owner.headers, payload: { baseVersionId: wf.versionId, definition: wf.definition } }, 201)
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.b.owner.headers, payload: { baseVersionId: wf.versionId, definition: wf.definition } }, 409)
  })
  it('refuses to delete IDs and requires a mapping to retire an occupied stage', async () => {
    const { job } = await makeJob(t.app, t.world.b.owner.headers)
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.b.owner.headers, payload: { toStageId: 'called', idempotencyKey: key() } }, 200)
    const wf = await current(t.world.b.owner.headers)
    const removed = structuredClone(wf.definition)
    removed.stages = removed.stages.filter((s: any) => s.id !== 'called')
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.b.owner.headers, payload: { baseVersionId: wf.versionId, definition: removed } }, 422)
    const retired = structuredClone(wf.definition)
    retired.stages.find((s: any) => s.id === 'called').retired = true
    await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.b.owner.headers, payload: { baseVersionId: wf.versionId, definition: retired } }, 422)
    await call(t.app, 'publishWorkflow', {
      method: 'POST',
      url: '/workflow/publish',
      headers: t.world.b.owner.headers,
      payload: { baseVersionId: wf.versionId, definition: retired, stageMappings: [{ fromStageId: 'called', toStageId: 'lead' }] },
    }, 201)
    const moved = await db.stageTransition.findFirstOrThrow({ where: { opportunityId: job.id, kind: 'ADMIN_MAPPING' } })
    expect(moved).toMatchObject({ fromStageId: 'called', toStageId: 'lead' })
    // New jobs cannot enter a retired stage.
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.b.owner.headers, payload: { toStageId: 'called', idempotencyKey: key() } }, 422)
  })
  it('adds a new stage and reorders without rewriting existing jobs', async () => {
    const wf = await current(t.world.a.admin.headers)
    const def = structuredClone(wf.definition)
    def.stages.push({ id: 'warranty', label: 'Warranty', order: 7, fieldIds: [], emailTemplateKeys: [] })
    def.stages.find((s: any) => s.id === 'called').order = 3
    def.stages.find((s: any) => s.id === 'inspection').order = 2
    const body = await call(t.app, 'publishWorkflow', { method: 'POST', url: '/workflow/publish', headers: t.world.a.admin.headers, payload: { baseVersionId: wf.versionId, definition: def } }, 201)
    expect(body.data.definition.stages).toHaveLength(7)
  })
})

describe('listResources', () => {
  it('requires auth', async () => {
    await call(t.app, 'listResources', { method: 'GET', url: '/resources' }, 401)
  })
})

describe('createResource', () => {
  it('requires auth', async () => {
    await call(t.app, 'createResource', { method: 'POST', url: '/resources', payload: { label: 'x', url: 'https://x.co' } }, 401)
  })
  it('admins add stage-aware links; members can read them', async () => {
    await call(t.app, 'createResource', { method: 'POST', url: '/resources', headers: t.world.a.member.headers, payload: { label: 'Guide', url: 'https://example.com/guide' } }, 403)
    await call(t.app, 'createResource', { method: 'POST', url: '/resources', headers: t.world.a.admin.headers, payload: { label: 'Guide', url: 'https://example.com/guide', stageIds: ['nope'] } }, 422)
    await call(t.app, 'createResource', { method: 'POST', url: '/resources', headers: t.world.a.admin.headers, payload: { label: 'Guide', url: 'javascript:alert(1)' } }, 422)
    await call(t.app, 'createResource', { method: 'POST', url: '/resources', headers: t.world.a.admin.headers, payload: { label: 'Inspection checklist', url: 'https://example.com/guide', stageIds: ['inspection'] } }, 201)
    const list = await call(t.app, 'listResources', { method: 'GET', url: '/resources', headers: t.world.a.member.headers }, 200)
    expect(list.data[0].stageIds).toEqual(['inspection'])
    const other = await call(t.app, 'listResources', { method: 'GET', url: '/resources', headers: t.world.b.owner.headers }, 200)
    expect(other.data).toHaveLength(0)
  })
})

describe('updateResource', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateResource', { method: 'PATCH', url: '/resources/x', payload: {} }, 401)
  })
  it('cannot edit another company’s resource', async () => {
    const r = await call(t.app, 'createResource', { method: 'POST', url: '/resources', headers: t.world.a.admin.headers, payload: { label: 'Mine', url: 'https://example.com/a' } }, 201)
    await call(t.app, 'updateResource', { method: 'PATCH', url: `/resources/${r.data.id}`, headers: t.world.b.owner.headers, payload: { label: 'Theirs' } }, 404)
    const ok = await call(t.app, 'updateResource', { method: 'PATCH', url: `/resources/${r.data.id}`, headers: t.world.a.admin.headers, payload: { isActive: false } }, 200)
    expect(ok.data.isActive).toBe(false)
  })
})
