import { db, type ActivityEvent, type Prisma } from '@project/db'
import { appendActivity, transaction } from '../lib/activity'
import { loadOpportunity } from '../lib/access'
import { hasPermission, requireOrg, type AuthContext } from '../lib/context'
import { forbidden, notFound, unprocessable } from '../lib/errors'
import { isUniqueViolation } from '../lib/idempotency'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { rateLimit } from '../lib/rateLimit'
import { recognitionsOut, userSummary, usersById } from '../lib/serialize'
import { currentWorkflow } from '../lib/workflow'
import { linkPendingAttachments, refOut } from './AttachmentService'
import { messageSummariesFor } from './EmailService'

type ListQuery = {
  cursor?: string
  limit?: number
  q?: string
  filter?: 'all' | 'mine' | 'messages' | 'team' | 'system'
  opportunityId?: string
  contactId?: string
  stageId?: string
  since?: string
}

type LogInput = {
  kind: 'note' | 'contact_attempt' | 'progress'
  stageId?: string
  methodId?: string | null
  outcomeId?: string | null
  note?: string | null
  occurredAt?: string | null
  nextFollowUpAt?: string | null
  attachmentIds?: string[]
  idempotencyKey: string
}

const KIND_TYPE = { note: 'note.added', contact_attempt: 'contact.attempt', progress: 'progress.updated' } as const

export class ActivityService {
  async list(auth: AuthContext, q: ListQuery) {
    const ctx = requireOrg(auth)
    const limit = normalizeLimit(q.limit, 100, 30)
    const cursor = decodeCursor(q.cursor)
    const and: Prisma.ActivityEventWhereInput[] = [{ organizationId: ctx.orgId }]
    if (q.opportunityId) and.push({ opportunityId: q.opportunityId })
    if (q.contactId) and.push({ contactId: q.contactId })
    if (q.stageId) and.push({ stageId: q.stageId })
    if (q.since) and.push({ recordedAt: { gt: new Date(q.since) } })
    switch (q.filter ?? 'all') {
      case 'messages':
        and.push({ category: 'MESSAGE' })
        break
      case 'team':
        and.push({ category: 'TEAM' })
        break
      case 'system':
        and.push({ category: 'SYSTEM' })
        break
      case 'mine': {
        const mine = await db.opportunity.findMany({ where: { organizationId: ctx.orgId, ownerId: ctx.userId }, select: { id: true } })
        and.push({ OR: [{ actorId: ctx.userId }, { opportunityId: { in: mine.map((m) => m.id) } }] })
        break
      }
    }
    if (q.q) {
      const [posts, contacts] = await Promise.all([
        db.post.findMany({ where: { organizationId: ctx.orgId, deletedAt: null, body: { contains: q.q } }, select: { id: true }, take: 200 }),
        db.contact.findMany({ where: { organizationId: ctx.orgId, name: { contains: q.q } }, select: { id: true }, take: 200 }),
      ])
      and.push({
        OR: [
          { note: { contains: q.q } },
          { postId: { in: posts.map((p) => p.id) } },
          { contactId: { in: contacts.map((c) => c.id) } },
        ],
      })
    }
    if (cursor)
      and.push({
        OR: [
          { occurredAt: { lt: new Date(cursor.createdAt) } },
          { occurredAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      })
    const rows = await db.activityEvent.findMany({
      where: { AND: and },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const last = items[items.length - 1]
    return {
      data: await hydrate(items, ctx.userId),
      meta: { hasMore, nextCursor: hasMore && last ? encodeCursor({ createdAt: last.occurredAt.toISOString(), id: last.id }) : null },
    }
  }

  /** Repeatable, timestamped job activity. Call logs are self-reported, never "verified". */
  async log(auth: AuthContext, opportunityId: string, input: LogInput) {
    const ctx = requireOrg(auth)
    const replay = await findByKey(ctx.orgId, input.idempotencyKey)
    if (replay) return (await hydrate([replay], ctx.userId))[0]!
    const opp = await loadOpportunity(ctx, opportunityId)
    const workflow = await currentWorkflow(ctx.orgId)
    const def = workflow.definition
    const stageId = input.stageId ?? opp.stageId
    if (!def.stages.some((s) => s.id === stageId)) throw unprocessable('Unknown stage')
    const note = input.note?.trim() || null
    if (input.kind === 'contact_attempt') {
      if (!input.methodId || !def.activity.methods.some((m) => m.id === input.methodId)) throw unprocessable('Choose how you contacted them')
      if (!input.outcomeId || !def.activity.outcomes.some((o) => o.id === input.outcomeId)) throw unprocessable('Choose the outcome')
    } else if (!note && !input.attachmentIds?.length) {
      throw unprocessable('Write a note or attach a file')
    }
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
    if (occurredAt.getTime() > Date.now() + 60_000) throw unprocessable('Activity cannot be dated in the future')
    const followUp = input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null

    try {
      const event = await transaction(async (tx) => {
        const e = await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: KIND_TYPE[input.kind],
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: input.kind === 'contact_attempt' ? 'SELF_REPORTED' : 'SYSTEM_RECORDED',
          contactId: opp.contactId,
          opportunityId,
          stageId,
          workflowVersionId: workflow.version.id,
          methodId: input.kind === 'contact_attempt' ? input.methodId : null,
          outcomeId: input.kind === 'contact_attempt' ? input.outcomeId : null,
          note,
          occurredAt,
          idempotencyKey: input.idempotencyKey,
          payload: followUp ? { nextFollowUpAt: followUp.toISOString() } : undefined,
        })
        if (followUp) await tx.opportunity.update({ where: { id: opportunityId }, data: { nextFollowUpAt: followUp } })
        await linkPendingAttachments(tx, {
          organizationId: ctx.orgId,
          attachmentIds: input.attachmentIds ?? [],
          activityEventId: e.id,
          opportunityId,
          contactId: opp.contactId,
          stageId,
        })
        return e
      })
      return (await hydrate([event], ctx.userId))[0]!
    } catch (err) {
      if (isUniqueViolation(err, 'idempotencyKey')) {
        const again = await findByKey(ctx.orgId, input.idempotencyKey)
        if (again) return (await hydrate([again], ctx.userId))[0]!
      }
      throw err
    }
  }

  /** Corrections append a new entry referencing the original; history is never rewritten. */
  async correct(auth: AuthContext, id: string, input: { note: string; methodId?: string | null; outcomeId?: string | null; idempotencyKey: string }) {
    const ctx = requireOrg(auth)
    const replay = await findByKey(ctx.orgId, input.idempotencyKey)
    if (replay) return (await hydrate([replay], ctx.userId))[0]!
    const original = await db.activityEvent.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!original) throw notFound('Activity')
    if (original.actorType !== 'USER') throw unprocessable('System entries cannot be corrected')
    if (original.actorId !== ctx.userId && !hasPermission(ctx, 'jobs.assign_any')) throw forbidden('Only the author or a manager can correct this entry')
    const event = await transaction((tx) =>
      appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'correction',
        category: original.category,
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SELF_REPORTED',
        contactId: original.contactId,
        opportunityId: original.opportunityId,
        stageId: original.stageId,
        workflowVersionId: original.workflowVersionId,
        methodId: input.methodId ?? null,
        outcomeId: input.outcomeId ?? null,
        note: input.note.trim(),
        revisionOfId: original.id,
        idempotencyKey: input.idempotencyKey,
        payload: { correctsType: original.type },
      }),
    )
    return (await hydrate([event], ctx.userId))[0]!
  }

  async createPost(auth: AuthContext, input: { body: string; opportunityId?: string | null; attachmentIds?: string[]; idempotencyKey: string }) {
    const ctx = requireOrg(auth)
    const replay = await findByKey(ctx.orgId, input.idempotencyKey)
    if (replay) return (await hydrate([replay], ctx.userId))[0]!
    await rateLimit(`post:${ctx.userId}`, 30, 10 * 60)
    const body = input.body.trim()
    if (!body) throw unprocessable('Write something to post')
    const opp = input.opportunityId ? await loadOpportunity(ctx, input.opportunityId) : null
    const event = await transaction(async (tx) => {
      const post = await tx.post.create({
        data: { organizationId: ctx.orgId, authorId: ctx.userId, body, opportunityId: opp?.id ?? null, createdAt: new Date() },
      })
      const e = await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'post.created',
        category: 'TEAM',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        postId: post.id,
        opportunityId: opp?.id ?? null,
        contactId: opp?.contactId ?? null,
        stageId: opp?.stageId ?? null,
        idempotencyKey: input.idempotencyKey,
      })
      await linkPendingAttachments(tx, {
        organizationId: ctx.orgId,
        attachmentIds: input.attachmentIds ?? [],
        activityEventId: e.id,
        opportunityId: opp?.id,
        contactId: opp?.contactId,
        stageId: opp?.stageId,
      })
      return e
    })
    return (await hydrate([event], ctx.userId))[0]!
  }

  async deletePost(auth: AuthContext, postId: string) {
    const ctx = requireOrg(auth)
    const post = await db.post.findFirst({ where: { id: postId, organizationId: ctx.orgId, deletedAt: null } })
    if (!post) throw notFound('Post')
    if (post.authorId !== ctx.userId && !hasPermission(ctx, 'jobs.assign_any')) throw forbidden('Only the author or a manager can remove this post')
    await db.post.update({ where: { id: postId }, data: { deletedAt: new Date() } })
  }

  async listComments(auth: AuthContext, eventId: string) {
    const ctx = requireOrg(auth)
    await this.event(ctx.orgId, eventId)
    const rows = await db.comment.findMany({ where: { activityEventId: eventId, deletedAt: null }, orderBy: { createdAt: 'asc' } })
    const people = await usersById(rows.map((r) => r.authorId))
    return rows.map((c) => ({ id: c.id, author: userSummary(people.get(c.authorId))!, body: c.body, createdAt: c.createdAt }))
  }

  async createComment(auth: AuthContext, eventId: string, body: string) {
    const ctx = requireOrg(auth)
    await this.event(ctx.orgId, eventId)
    await rateLimit(`comment:${ctx.userId}`, 60, 10 * 60)
    const text = body.trim()
    if (!text) throw unprocessable('Write a comment')
    const c = await db.comment.create({ data: { organizationId: ctx.orgId, activityEventId: eventId, authorId: ctx.userId, body: text } })
    const people = await usersById([ctx.userId])
    return { id: c.id, author: userSummary(people.get(ctx.userId))!, body: c.body, createdAt: c.createdAt }
  }

  async toggleReaction(auth: AuthContext, eventId: string, code: string) {
    const ctx = requireOrg(auth)
    await this.event(ctx.orgId, eventId)
    const existing = await db.reaction.findUnique({
      where: { activityEventId_userId_code: { activityEventId: eventId, userId: ctx.userId, code } },
    })
    if (existing) await db.reaction.delete({ where: { id: existing.id } })
    else
      await db.reaction
        .create({ data: { organizationId: ctx.orgId, activityEventId: eventId, userId: ctx.userId, code } })
        .catch((err) => {
          if (!isUniqueViolation(err)) throw err
        })
    return reactionSummaries(eventId, ctx.userId)
  }

  private async event(orgId: string, id: string) {
    const e = await db.activityEvent.findFirst({ where: { id, organizationId: orgId } })
    if (!e) throw notFound('Activity')
    return e
  }
}

async function findByKey(organizationId: string, idempotencyKey: string) {
  return db.activityEvent.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } } })
}

async function reactionSummaries(eventId: string, viewerId: string) {
  const rows = await db.reaction.findMany({ where: { activityEventId: eventId } })
  return summarizeReactions(rows, viewerId)
}

function summarizeReactions(rows: { code: string; userId: string }[], viewerId: string) {
  const byCode = new Map<string, { code: string; count: number; mine: boolean }>()
  for (const r of rows) {
    const s = byCode.get(r.code) ?? { code: r.code, count: 0, mine: false }
    s.count++
    if (r.userId === viewerId) s.mine = true
    byCode.set(r.code, s)
  }
  return [...byCode.values()]
}

/**
 * Batch-loads everything an ActivityItem renders (actors, subjects, posts, message status,
 * recognition, files, reactions, comment counts) for a page of events.
 */
export async function hydrate(events: ActivityEvent[], viewerId: string) {
  if (!events.length) return []
  const ids = events.map((e) => e.id)
  const pick = <K extends keyof ActivityEvent>(k: K) => [...new Set(events.map((e) => e[k]).filter(Boolean))] as string[]
  const [people, contacts, jobs, posts, messages, recognitions, links, reactions, commentCounts] = await Promise.all([
    usersById(pick('actorId')),
    db.contact.findMany({ where: { id: { in: pick('contactId') } }, select: { id: true, name: true } }),
    db.opportunity.findMany({ where: { id: { in: pick('opportunityId') } }, select: { id: true, title: true } }),
    db.post.findMany({ where: { id: { in: pick('postId') } } }),
    db.outboundMessage.findMany({ where: { id: { in: pick('outboundMessageId') } } }),
    db.recognition.findMany({ where: { id: { in: pick('recognitionId') } }, include: { type: true } }),
    db.attachmentLink.findMany({ where: { activityEventId: { in: ids }, attachment: { deletedAt: null } }, include: { attachment: true } }),
    db.reaction.findMany({ where: { activityEventId: { in: ids } }, select: { activityEventId: true, code: true, userId: true } }),
    db.comment.groupBy({ by: ['activityEventId'], where: { activityEventId: { in: ids }, deletedAt: null }, _count: true }),
  ])
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const jobMap = new Map(jobs.map((j) => [j.id, j]))
  const postMap = new Map(posts.map((p) => [p.id, p]))
  const messageMap = await messageSummariesFor(messages)
  const recognitionMap = await recognitionsOut(recognitions)
  const refs = await Promise.all(links.map(async (l) => ({ eventId: l.activityEventId!, ref: await refOut(l) })))
  const commentMap = new Map(commentCounts.map((c) => [c.activityEventId, c._count]))

  return events.map((e) => {
    const post = e.postId ? postMap.get(e.postId) : null
    return {
      id: e.id,
      type: e.type,
      category: e.category,
      actorType: e.actorType,
      actor: userSummary(e.actorId ? people.get(e.actorId) : null),
      actorLabel: e.actorLabel,
      contact: e.contactId && contactMap.has(e.contactId) ? { id: e.contactId, label: contactMap.get(e.contactId)!.name } : null,
      opportunity: e.opportunityId && jobMap.has(e.opportunityId) ? { id: e.opportunityId, label: jobMap.get(e.opportunityId)!.title } : null,
      stageId: e.stageId,
      methodId: e.methodId,
      outcomeId: e.outcomeId,
      note: e.note,
      payload: (e.payload as Record<string, unknown> | null) ?? null,
      verification: e.verification,
      occurredAt: e.occurredAt,
      recordedAt: e.recordedAt,
      revisionOfId: e.revisionOfId,
      post: post ? { id: post.id, body: post.deletedAt ? '' : post.body, deleted: !!post.deletedAt } : null,
      message: e.outboundMessageId ? messageMap.get(e.outboundMessageId) ?? null : null,
      recognition: e.recognitionId ? recognitionMap.get(e.recognitionId) ?? null : null,
      attachments: refs.filter((r) => r.eventId === e.id).map((r) => r.ref),
      reactions: summarizeReactions(reactions.filter((r) => r.activityEventId === e.id), viewerId),
      commentCount: commentMap.get(e.id) ?? 0,
    }
  })
}
