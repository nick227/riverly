import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

const log = (jobId: string, headers: any, payload: any, status = 201) =>
  call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${jobId}/activities`, headers, payload: { idempotencyKey: key(), ...payload } }, status)

describe('logActivity', () => {
  it('requires auth', async () => {
    await call(t.app, 'logActivity', { method: 'POST', url: '/opportunities/x/activities', payload: { kind: 'note', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('keeps 3 calls, 2 voicemails and 1 conversation as six separate self-reported records', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const outcomes = ['no_answer', 'no_answer', 'no_answer', 'voicemail', 'voicemail', 'spoke']
    for (const outcomeId of outcomes) await log(job.id, t.world.a.member.headers, { kind: 'contact_attempt', stageId: 'called', methodId: 'phone', outcomeId })
    const rows = await db.activityEvent.findMany({ where: { opportunityId: job.id, type: 'contact.attempt' } })
    expect(rows).toHaveLength(6)
    expect(new Set(rows.map((r) => r.id)).size).toBe(6)
    expect(rows.every((r) => r.verification === 'SELF_REPORTED')).toBe(true)
    const detail = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    const summary = detail.data.stageSummaries.find((s: any) => s.stageId === 'called')
    expect(summary).toMatchObject({ attemptCount: 6, latestOutcomeId: 'spoke' })
    // Logging in Called while the job is in New Lead does not move the job.
    expect(detail.data.stageId).toBe('lead')
  })
  it('a repeated idempotency key returns the original entry', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const k = key()
    const a = await log(job.id, t.world.a.member.headers, { kind: 'note', note: 'Gate code 1234', idempotencyKey: k })
    const b = await log(job.id, t.world.a.member.headers, { kind: 'note', note: 'Gate code 1234', idempotencyKey: k })
    expect(a.data.id).toBe(b.data.id)
  })
  it('requires method and outcome for contact attempts and sets the follow-up', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await log(job.id, t.world.a.member.headers, { kind: 'contact_attempt', methodId: 'phone' }, 422)
    const follow = new Date(Date.now() + 86_400_000).toISOString()
    await log(job.id, t.world.a.member.headers, { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'voicemail', nextFollowUpAt: follow })
    const row = await db.opportunity.findUniqueOrThrow({ where: { id: job.id } })
    expect(row.nextFollowUpAt?.toISOString()).toBe(follow)
  })
  it('cannot write to another company’s job', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await log(job.id, t.world.b.owner.headers, { kind: 'note', note: 'x' }, 404)
  })
})

describe('listActivity', () => {
  it('requires auth', async () => {
    await call(t.app, 'listActivity', { method: 'GET', url: '/activity' }, 401)
  })
  it('projects one store: company river, job history and stage filter', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await log(job.id, t.world.a.member.headers, { kind: 'note', stageId: 'inspection', note: 'Ladder needed' })
    const jobFeed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(jobFeed.data.map((e: any) => e.type)).toEqual(['note.added', 'lead.received'])
    const stageFeed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}&stageId=inspection`, headers: t.world.a.member.headers }, 200)
    expect(stageFeed.data).toHaveLength(1)
    const company = await call(t.app, 'listActivity', { method: 'GET', url: '/activity?q=Ladder', headers: t.world.a.manager.headers }, 200)
    expect(company.data[0].opportunity.id).toBe(job.id)
    const other = await call(t.app, 'listActivity', { method: 'GET', url: '/activity?q=Ladder', headers: t.world.b.owner.headers }, 200)
    expect(other.data).toHaveLength(0)
  })
  it('filters Team vs System without changing storage', async () => {
    await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.a.member.headers, payload: { body: 'Great week team', idempotencyKey: key() } }, 201)
    const team = await call(t.app, 'listActivity', { method: 'GET', url: '/activity?filter=team', headers: t.world.a.member.headers }, 200)
    expect(team.data.every((e: any) => e.category === 'TEAM')).toBe(true)
    expect(team.data[0].post.body).toBe('Great week team')
  })
})

describe('correctActivity', () => {
  it('requires auth', async () => {
    await call(t.app, 'correctActivity', { method: 'POST', url: '/activity/x/corrections', payload: { note: 'x', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('appends a correction and leaves the original untouched', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const original = await log(job.id, t.world.a.member.headers, { kind: 'contact_attempt', methodId: 'phone', outcomeId: 'spoke' })
    const fix = await call(t.app, 'correctActivity', { method: 'POST', url: `/activity/${original.data.id}/corrections`, headers: t.world.a.member.headers, payload: { note: 'Actually left a voicemail', outcomeId: 'voicemail', idempotencyKey: key() } }, 201)
    expect(fix.data.revisionOfId).toBe(original.data.id)
    const still = await db.activityEvent.findUniqueOrThrow({ where: { id: original.data.id } })
    expect(still.outcomeId).toBe('spoke')
  })
  it('only the author or a manager may correct', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const original = await log(job.id, t.world.a.manager.headers, { kind: 'note', note: 'manager note' })
    await call(t.app, 'correctActivity', { method: 'POST', url: `/activity/${original.data.id}/corrections`, headers: t.world.a.member.headers, payload: { note: 'no', idempotencyKey: key() } }, 403)
  })
})

describe('listComments', () => {
  it('requires auth', async () => {
    await call(t.app, 'listComments', { method: 'GET', url: '/activity/x/comments' }, 401)
  })
})

describe('createComment', () => {
  it('requires auth', async () => {
    await call(t.app, 'createComment', { method: 'POST', url: '/activity/x/comments', payload: { body: 'x' } }, 401)
  })
  it('comments on a river item; other companies cannot see or add', async () => {
    const post = await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.a.member.headers, payload: { body: 'Roof done', idempotencyKey: key() } }, 201)
    await call(t.app, 'createComment', { method: 'POST', url: `/activity/${post.data.id}/comments`, headers: t.world.a.manager.headers, payload: { body: 'Nice work' } }, 201)
    const list = await call(t.app, 'listComments', { method: 'GET', url: `/activity/${post.data.id}/comments`, headers: t.world.a.member.headers }, 200)
    expect(list.data[0].body).toBe('Nice work')
    await call(t.app, 'listComments', { method: 'GET', url: `/activity/${post.data.id}/comments`, headers: t.world.b.owner.headers }, 404)
    await call(t.app, 'createComment', { method: 'POST', url: `/activity/${post.data.id}/comments`, headers: t.world.b.owner.headers, payload: { body: 'spam' } }, 404)
  })
})

describe('toggleReaction', () => {
  it('requires auth', async () => {
    await call(t.app, 'toggleReaction', { method: 'POST', url: '/activity/x/reactions', payload: { code: 'heart' } }, 401)
  })
  it('toggles per viewer', async () => {
    const post = await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.a.member.headers, payload: { body: 'React to me', idempotencyKey: key() } }, 201)
    const on = await call(t.app, 'toggleReaction', { method: 'POST', url: `/activity/${post.data.id}/reactions`, headers: t.world.a.manager.headers, payload: { code: 'heart' } }, 200)
    expect(on.data).toEqual([{ code: 'heart', count: 1, mine: true }])
    const off = await call(t.app, 'toggleReaction', { method: 'POST', url: `/activity/${post.data.id}/reactions`, headers: t.world.a.manager.headers, payload: { code: 'heart' } }, 200)
    expect(off.data).toEqual([])
  })
})

describe('createPost', () => {
  it('requires auth', async () => {
    await call(t.app, 'createPost', { method: 'POST', url: '/posts', payload: { body: 'x', idempotencyKey: 'abcdefgh' } }, 401)
  })
  it('a post associated with a job also appears in that job’s history', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.a.member.headers, payload: { body: 'Tear-off done', opportunityId: job.id, idempotencyKey: key() } }, 201)
    const feed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(feed.data[0].type).toBe('post.created')
  })
  it('cannot associate a post with another company’s job', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.b.owner.headers, payload: { body: 'x', opportunityId: job.id, idempotencyKey: key() } }, 404)
  })
})

describe('deletePost', () => {
  it('requires auth', async () => {
    await call(t.app, 'deletePost', { method: 'DELETE', url: '/posts/x' }, 401)
  })
  it('author removes their post; the river keeps a removed placeholder', async () => {
    const post = await call(t.app, 'createPost', { method: 'POST', url: '/posts', headers: t.world.a.member.headers, payload: { body: 'oops', idempotencyKey: key() } }, 201)
    await call(t.app, 'deletePost', { method: 'DELETE', url: `/posts/${post.data.post.id}`, headers: t.world.a.member.headers }, 200)
    const feed = await call(t.app, 'listActivity', { method: 'GET', url: '/activity?filter=team', headers: t.world.a.member.headers }, 200)
    const item = feed.data.find((e: any) => e.id === post.data.id)
    expect(item.post).toEqual({ id: post.data.post.id, body: '', deleted: true })
  })
})
