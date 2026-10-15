import { describe, expect, it } from 'vitest'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

describe('getManageOverview', () => {
  it('requires auth', async () => {
    await call(t.app, 'getManageOverview', { method: 'GET', url: '/manage/overview' }, 401)
  })
  it('is for managers and shows neglected and unassigned leads', async () => {
    await call(t.app, 'getManageOverview', { method: 'GET', url: '/manage/overview', headers: t.world.a.member.headers }, 403)
    const { job } = await makeJob(t.app, t.world.a.member.headers, { name: 'Neglected Lead' })
    const body = await call(t.app, 'getManageOverview', { method: 'GET', url: '/manage/overview', headers: t.world.a.manager.headers }, 200)
    expect(body.data.unassignedLeads.map((j: any) => j.id)).toContain(job.id)
    expect(body.data.noOutreachYet.map((j: any) => j.id)).toContain(job.id)
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'voicemail', idempotencyKey: key() } }, 201)
    const after = await call(t.app, 'getManageOverview', { method: 'GET', url: '/manage/overview', headers: t.world.a.manager.headers }, 200)
    expect(after.data.noOutreachYet.map((j: any) => j.id)).not.toContain(job.id)
    expect(after.data.workload.find((w: any) => w.owner.id === t.world.a.member.id).attempts7d).toBe(1)
  })
})

describe('getPipelineReport', () => {
  it('requires auth', async () => {
    await call(t.app, 'getPipelineReport', { method: 'GET', url: '/reports/pipeline' }, 401)
  })
  it('counts by stable stage IDs and flags missing data', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers, { job: { title: 'Roof' } })
    await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId: 'inspection', idempotencyKey: key() } }, 200)
    const body = await call(t.app, 'getPipelineReport', { method: 'GET', url: '/reports/pipeline', headers: t.world.a.manager.headers }, 200)
    expect(body.data.reachedStage.find((r: any) => r.key === 'inspection').count).toBeGreaterThanOrEqual(1)
    expect(body.data.dataQuality.missingSource).toBeGreaterThanOrEqual(1)
    const other = await call(t.app, 'getPipelineReport', { method: 'GET', url: '/reports/pipeline', headers: t.world.b.owner.headers }, 200)
    expect(other.data.byStage.reduce((n: number, r: any) => n + r.count, 0)).toBe(0)
  })
})

describe('getActivityReport', () => {
  it('requires auth', async () => {
    await call(t.app, 'getActivityReport', { method: 'GET', url: '/reports/activity' }, 401)
  })
  it('separates self-reported attempts from verified outreach', async () => {
    const body = await call(t.app, 'getActivityReport', { method: 'GET', url: '/reports/activity', headers: t.world.a.manager.headers }, 200)
    expect(body.data.verification.find((r: any) => r.key === 'SELF_REPORTED').count).toBeGreaterThanOrEqual(1)
    expect(body.data.firstOutreach.medianMinutesVerified).toBeNull()
    expect(body.data.firstOutreach.reached).toBeGreaterThanOrEqual(1)
  })
})

describe('listWorkerRuns', () => {
  it('requires auth', async () => {
    await call(t.app, 'listWorkerRuns', { method: 'GET', url: '/diagnostics/worker-runs' }, 401)
  })
  it('is admin-only diagnostics', async () => {
    await call(t.app, 'listWorkerRuns', { method: 'GET', url: '/diagnostics/worker-runs', headers: t.world.a.manager.headers }, 403)
    await call(t.app, 'listWorkerRuns', { method: 'GET', url: '/diagnostics/worker-runs', headers: t.world.a.admin.headers }, 200)
  })
})
