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

describe('getSalesBoard', () => {
  const board = (headers: Record<string, string>, period = 'today') =>
    call(t.app, 'getSalesBoard', { method: 'GET', url: `/manage/board?period=${period}`, headers }, 200).then((b) => b.data)
  const move = (id: string, toStageId: string) =>
    call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${id}/transitions`, headers: t.world.a.member.headers, payload: { toStageId, idempotencyKey: key() } }, 200)

  it('requires auth', async () => {
    await call(t.app, 'getSalesBoard', { method: 'GET', url: '/manage/board' }, 401)
  })

  it('counts calls, leads and first-time signed contracts for every member, per company', async () => {
    const before = await board(t.world.a.member.headers)
    const { job } = await makeJob(t.app, t.world.a.member.headers, { name: 'Board Sale' })
    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers, payload: { contractValueCents: 1_850_000 } }, 200)
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'spoke', idempotencyKey: key() } }, 201)
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'contact_attempt', methodId: 'sms', outcomeId: 'sent', idempotencyKey: key() } }, 201)
    await move(job.id, 'contract')
    // Moving back and signing again is still one sale.
    await move(job.id, 'inspection')
    await move(job.id, 'contract')

    const now = await board(t.world.a.member.headers)
    expect(now.metrics.calls - before.metrics.calls).toBe(1)
    expect(now.metrics.newLeads - before.metrics.newLeads).toBe(1)
    expect(now.metrics.sales - before.metrics.sales).toBe(1)
    expect(now.metrics.salesValueCents - before.metrics.salesValueCents).toBe(1_850_000)
    expect(now.topSale).toMatchObject({ opportunityId: job.id, valueCents: 1_850_000, contactName: 'Board Sale' })
    const leaderBefore = before.leaders.find((l: any) => l.user.id === t.world.a.member.id)
    expect(now.leaders[0]).toMatchObject({ user: { id: t.world.a.member.id }, sales: 1, calls: (leaderBefore?.calls ?? 0) + 1 })

    const week = await board(t.world.a.manager.headers, 'week')
    expect(week.metrics.sales).toBeGreaterThanOrEqual(1)

    const other = await board(t.world.b.owner.headers)
    expect(other.metrics).toMatchObject({ calls: 0, sales: 0, salesValueCents: 0 })
    expect(other.topSale).toBeNull()
    expect(other.leaders).toEqual([])
  })
})

describe('listOpportunities attention filter', () => {
  const ids = (attention: string) =>
    call(t.app, 'listOpportunities', { method: 'GET', url: `/opportunities?attention=${attention}`, headers: t.world.a.member.headers }, 200).then((b) => b.data.map((j: any) => j.id))

  it('replaces the old manager rail lists on Contacts', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers, { name: 'Needs A Call' })
    expect(await ids('no_outreach')).toContain(job.id)
    expect(await ids('overdue')).not.toContain(job.id)
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'voicemail', nextFollowUpAt: new Date(Date.now() - 60_000).toISOString(), idempotencyKey: key() } }, 201)
    expect(await ids('no_outreach')).not.toContain(job.id)
    expect(await ids('overdue')).toContain(job.id)
    expect(await ids('quiet')).not.toContain(job.id)
  })
})

describe('getCompanyHome', () => {
  const home = (headers: Record<string, string>) => call(t.app, 'getCompanyHome', { method: 'GET', url: '/company/home', headers }, 200).then((b) => b.data)

  it('requires auth', async () => {
    await call(t.app, 'getCompanyHome', { method: 'GET', url: '/company/home' }, 401)
  })

  it('shows waiting work, all-time company totals and the viewer’s own totals, per company', async () => {
    const member = t.world.a.member
    const before = await home(member.headers)
    const { job } = await makeJob(t.app, member.headers, { name: 'Home Page Sale' })
    if (job.ownerId !== member.id)
      await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: t.world.a.manager.headers, payload: { ownerId: member.id } }, 200)
    const fresh = await home(member.headers)
    expect(fresh.waiting.notContacted - before.waiting.notContacted).toBe(1)
    expect(fresh.company.leads - before.company.leads).toBe(1)
    expect(fresh.company.contacts - before.company.contacts).toBe(1)
    expect(fresh.you.openJobs - before.you.openJobs).toBe(1)
    const inStage = (h: any, id: string) => h.stages.find((st: any) => st.stageId === id).count
    expect(fresh.stages.map((st: any) => st.stageId)).toEqual(['lead', 'called', 'inspection', 'contract', 'started', 'completed'])
    expect(inStage(fresh, 'lead') - inStage(before, 'lead')).toBe(1)
    const task = (h: any) => h.tasks.find((x: any) => x.opportunityId === job.id)
    expect(task(fresh)).toMatchObject({ kind: 'first_call', contactName: 'Home Page Sale' })
    expect(task(await home(t.world.a.manager.headers))).toBeUndefined()

    await call(t.app, 'updateOpportunity', { method: 'PATCH', url: `/opportunities/${job.id}`, headers: member.headers, payload: { contractValueCents: 1_200_000 } }, 200)
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: member.headers, payload: { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'voicemail', nextFollowUpAt: new Date(Date.now() - 60_000).toISOString(), idempotencyKey: key() } }, 201)
    expect(task(await home(member.headers))).toMatchObject({ kind: 'follow_up' })
    for (const stage of ['contract', 'started', 'completed'])
      await call(t.app, 'transitionOpportunity', { method: 'POST', url: `/opportunities/${job.id}/transitions`, headers: member.headers, payload: { toStageId: stage, idempotencyKey: key() } }, 200)

    const after = await home(member.headers)
    expect(inStage(after, 'completed') - inStage(before, 'completed')).toBe(1)
    expect(after.waiting.notContacted).toBe(before.waiting.notContacted)
    expect(after.waiting.overdueFollowUps - before.waiting.overdueFollowUps).toBe(1)
    for (const scope of ['company', 'you'] as const) {
      expect(after[scope].calls - before[scope].calls).toBe(1)
      expect(after[scope].sales - before[scope].sales).toBe(1)
      expect(after[scope].salesValueCents - before[scope].salesValueCents).toBe(1_200_000)
      expect(after[scope].completed - before[scope].completed).toBe(1)
    }
    // Credited to the owner, not to a teammate.
    const manager = await home(t.world.a.manager.headers)
    expect(manager.company.sales).toBe(after.company.sales)
    expect(manager.you.salesValueCents).not.toBeGreaterThanOrEqual(after.company.salesValueCents)

    const other = await home(t.world.b.owner.headers)
    expect(other.company).toMatchObject({ calls: 0, sales: 0, salesValueCents: 0, completed: 0 })
  })
})
