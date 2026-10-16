import { db, type OpportunityStatus, type Prisma } from '@project/db'
import { VALUE_FIELD_TYPES, type WorkflowDefinition } from '@project/shared'
import { appendActivity, transaction } from '../lib/activity'
import { loadOpportunity, opportunityScope } from '../lib/access'
import { hasPermission, requireOrg, type AuthContext, type OrgContext } from '../lib/context'
import { forbidden, notFound, unprocessable } from '../lib/errors'
import { isUniqueViolation } from '../lib/idempotency'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import {
  contactOut,
  externalPersonOut,
  opportunitySummary,
  opportunitySummaryInclude,
  transitionOut,
  userSummary,
  userSummarySelect,
  usersById,
} from '../lib/serialize'
import { currentWorkflow, firstStageId } from '../lib/workflow'
import { attachmentRefs } from './AttachmentService'
import { messageSummariesFor } from './EmailService'
import { validateFieldValue } from './fieldValues'
import { assertMemberTx, assertOption, fieldIdForBinding } from './jobs'

type ListQuery = {
  cursor?: string
  limit?: number
  q?: string
  stageId?: string
  ownerId?: string
  status?: string
  leadSourceOptionId?: string
  sort?: 'recent' | 'oldest' | 'stale'
  attention?: Attention
}

/** Contacts "Needs attention" filters (formerly the manager rail on Activity). */
type Attention = 'no_outreach' | 'overdue' | 'upcoming' | 'quiet'
const DAY = 24 * 60 * 60 * 1000
const QUIET_DAYS = 7
const UPCOMING_DAYS = 14

const ACTIVE_STATUSES: OpportunityStatus[] = ['OPEN', 'WON']

type UpdateInput = {
  title?: string
  propertyAddress?: string | null
  inquiry?: string | null
  leadSourceOptionId?: string | null
  urgencyOptionId?: string | null
  ownerId?: string | null
  nextFollowUpAt?: string | null
  estimatedValueCents?: number | null
  contractValueCents?: number | null
}

const NATIVE_FIELD_OF: Record<keyof UpdateInput, string> = {
  title: 'opportunity.title',
  propertyAddress: 'opportunity.propertyAddress',
  inquiry: 'opportunity.inquiry',
  leadSourceOptionId: 'opportunity.leadSourceOptionId',
  urgencyOptionId: 'opportunity.urgencyOptionId',
  ownerId: 'opportunity.ownerId',
  nextFollowUpAt: 'opportunity.nextFollowUpAt',
  estimatedValueCents: 'opportunity.estimatedValueCents',
  contractValueCents: 'opportunity.contractValueCents',
}

export class OpportunityService {
  async list(auth: AuthContext, q: ListQuery) {
    const ctx = requireOrg(auth)
    const limit = normalizeLimit(q.limit, 100, 25)
    const base: Prisma.OpportunityWhereInput = { AND: [this.filters(ctx, q), await attentionFilter(ctx.orgId, q.attention)] }
    const sort = q.sort ?? 'recent'
    const sortField = sort === 'stale' ? 'lastActivityAt' : 'createdAt'
    const dir = sort === 'recent' ? 'desc' : 'asc'
    const cursor = decodeCursor(q.cursor)
    const cmp = dir === 'desc' ? 'lt' : 'gt'
    const where: Prisma.OpportunityWhereInput = {
      AND: [
        base,
        q.stageId ? { stageId: q.stageId } : {},
        cursor
          ? {
              OR: [
                { [sortField]: { [cmp]: new Date(cursor.createdAt) } },
                { [sortField]: new Date(cursor.createdAt), id: { [cmp]: cursor.id } },
              ],
            }
          : {},
      ],
    }
    const [rows, counts] = await Promise.all([
      db.opportunity.findMany({
        where,
        orderBy: [{ [sortField]: dir }, { id: dir }],
        take: limit + 1,
        include: opportunitySummaryInclude,
      }),
      db.opportunity.groupBy({ by: ['stageId'], where: base, _count: true }),
    ])
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const last = items[items.length - 1]
    return {
      data: items.map(opportunitySummary),
      meta: {
        hasMore,
        nextCursor: hasMore && last ? encodeCursor({ createdAt: (last[sortField] as Date).toISOString(), id: last.id }) : null,
        stageCounts: Object.fromEntries(counts.map((c) => [c.stageId, c._count])),
      },
    }
  }

  private filters(ctx: OrgContext, q: ListQuery): Prisma.OpportunityWhereInput {
    const status = q.status ?? 'ACTIVE'
    const digits = q.q?.replace(/\D/g, '') ?? ''
    return {
      ...opportunityScope(ctx),
      ...(status === 'ALL' ? {} : status === 'ACTIVE' ? { status: { in: ACTIVE_STATUSES } } : { status: status as OpportunityStatus }),
      ...(q.ownerId === 'none' ? { ownerId: null } : q.ownerId === 'me' ? { ownerId: ctx.userId } : q.ownerId ? { ownerId: q.ownerId } : {}),
      ...(q.leadSourceOptionId ? { leadSourceOptionId: q.leadSourceOptionId } : {}),
      ...(q.q
        ? {
            OR: [
              { title: { contains: q.q } },
              { propertyAddress: { contains: q.q } },
              { contact: { name: { contains: q.q } } },
              { contact: { email: { contains: q.q } } },
              ...(digits.length >= 3 ? [{ contact: { phoneNormalized: { contains: digits } } }] : []),
            ],
          }
        : {}),
    }
  }

  async get(auth: AuthContext, id: string) {
    const ctx = requireOrg(auth)
    await loadOpportunity(ctx, id)
    return this.detail(ctx, id)
  }

  async detail(ctx: OrgContext, id: string) {
    const o = await db.opportunity.findFirstOrThrow({
      where: { id, organizationId: ctx.orgId },
      include: {
        ...opportunitySummaryInclude,
        contact: true,
        fieldValues: true,
        stageTransitions: { orderBy: { occurredAt: 'desc' }, take: 50 },
        appointments: { orderBy: { startsAt: 'desc' }, include: { externalPerson: true } },
        participants: { where: { removedAt: null }, include: { externalPerson: true }, orderBy: { createdAt: 'asc' } },
        externalLinks: { orderBy: { createdAt: 'asc' } },
        reviewRequests: { orderBy: { createdAt: 'desc' }, include: { messages: { orderBy: { queuedAt: 'desc' }, take: 1 } } },
        sourceRecord: { include: { source: true } },
      },
    })
    const people = await usersById([
      ...o.stageTransitions.map((t) => t.actorId),
      ...o.appointments.map((a) => a.assigneeUserId),
      ...o.participants.map((p) => p.memberUserId),
      ...o.reviewRequests.flatMap((r) => r.messages.map((m) => m.requestedById)),
    ])
    const [events, otherJobs, attachments, messageMap] = await Promise.all([
      db.activityEvent.findMany({
        where: { organizationId: ctx.orgId, opportunityId: id },
        select: { stageId: true, type: true, methodId: true, outcomeId: true, occurredAt: true },
        orderBy: { occurredAt: 'asc' },
      }),
      db.opportunity.findMany({
        where: { organizationId: ctx.orgId, contactId: o.contactId, deletedAt: null, id: { not: id } },
        include: opportunitySummaryInclude,
        orderBy: { createdAt: 'desc' },
      }),
      attachmentRefs({ organizationId: ctx.orgId, opportunityId: id }),
      messageSummariesFor(o.reviewRequests.flatMap((r) => r.messages)),
    ])

    const summaries = new Map<string, { stageId: string; eventCount: number; attemptCount: number; lastEventAt: Date | null; latestMethodId: string | null; latestOutcomeId: string | null }>()
    for (const e of events) {
      if (!e.stageId) continue
      const s = summaries.get(e.stageId) ?? { stageId: e.stageId, eventCount: 0, attemptCount: 0, lastEventAt: null, latestMethodId: null, latestOutcomeId: null }
      s.eventCount++
      s.lastEventAt = e.occurredAt
      if (e.type === 'contact.attempt') {
        s.attemptCount++
        s.latestMethodId = e.methodId
        s.latestOutcomeId = e.outcomeId
      }
      summaries.set(e.stageId, s)
    }

    return {
      ...opportunitySummary({ ...o, contact: { name: o.contact.name } }),
      propertyAddress: o.propertyAddress,
      inquiry: o.inquiry,
      urgencyOptionId: o.urgencyOptionId,
      statusReason: o.statusReason,
      workflowVersionId: o.workflowVersionId,
      leadReceivedVia: o.leadReceivedVia,
      contact: contactOut(o.contact),
      fieldValues: Object.fromEntries(o.fieldValues.map((v) => [v.fieldId, v.value])),
      stageSummaries: [...summaries.values()],
      transitions: o.stageTransitions.map((t) => transitionOut(t, t.actorId ? people.get(t.actorId) : null)),
      appointments: o.appointments.map((a) => appointmentOut(a, people)),
      participants: o.participants.map((p) => ({
        id: p.id,
        roleKey: p.roleKey,
        stageId: p.stageId,
        member: userSummary(p.memberUserId ? people.get(p.memberUserId) : null),
        externalPerson: externalPersonOut(p.externalPerson),
      })),
      attachments,
      externalLinks: o.externalLinks.map(externalLinkOut),
      reviewRequests: o.reviewRequests.map((r) => ({
        id: r.id,
        destinationUrl: r.destinationUrl,
        reviewStatus: r.reviewStatus,
        createdAt: r.createdAt,
        latestMessage: r.messages[0] ? messageMap.get(r.messages[0].id) ?? null : null,
      })),
      source: o.sourceRecord
        ? {
            sourceRecordId: o.sourceRecord.id,
            sourceName: o.sourceRecord.source.displayName,
            kind: o.sourceRecord.source.kind,
            receivedAt: o.sourceRecord.receivedAt,
            providerTimestamp: o.sourceRecord.providerTimestamp,
            matchedBy: 'origin',
          }
        : null,
      otherJobs: otherJobs.map(opportunitySummary),
    }
  }

  async update(auth: AuthContext, id: string, input: UpdateInput) {
    const ctx = requireOrg(auth)
    const before = await loadOpportunity(ctx, id)
    const { definition } = await currentWorkflow(ctx.orgId)

    if (input.title !== undefined && !input.title.trim()) throw unprocessable('Service cannot be empty')
    assertOption(definition, fieldIdForBinding(definition, 'opportunity.leadSourceOptionId'), input.leadSourceOptionId, before.leadSourceOptionId)
    assertOption(definition, fieldIdForBinding(definition, 'opportunity.urgencyOptionId'), input.urgencyOptionId, before.urgencyOptionId)

    const ownerChanging = input.ownerId !== undefined && input.ownerId !== before.ownerId
    if (ownerChanging) assertCanAssign(ctx, before.ownerId, input.ownerId ?? null)

    const { data, changes } = diffNativeFields(definition, before, input)
    if (!Object.keys(data).length) return this.summary(id)

    await transaction(async (tx) => {
      if (ownerChanging && input.ownerId) await assertMemberTx(tx, ctx.orgId, input.ownerId)
      await tx.opportunity.update({ where: { id }, data })
      if (ownerChanging) {
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'assignment.changed',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: before.contactId,
          opportunityId: id,
          stageId: before.stageId,
          workflowVersionId: before.workflowVersionId,
          payload: { fromOwnerId: before.ownerId, toOwnerId: input.ownerId ?? null },
        })
      }
      if (changes.length) {
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'job.updated',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: before.contactId,
          opportunityId: id,
          stageId: before.stageId,
          workflowVersionId: before.workflowVersionId,
          payload: { changes } as unknown as Prisma.InputJsonValue,
        })
      }
    })
    return this.summary(id)
  }

  async setField(auth: AuthContext, id: string, fieldId: string, rawValue: unknown) {
    const ctx = requireOrg(auth)
    const opp = await loadOpportunity(ctx, id)
    const workflow = await currentWorkflow(ctx.orgId)
    const field = workflow.definition.fields.find((f) => f.id === fieldId)
    if (!field) throw notFound('Field')
    if (field.binding) throw unprocessable(`${field.label} is stored on the job; update it with PATCH /opportunities/{id}`)
    if (!(VALUE_FIELD_TYPES as readonly string[]).includes(field.type))
      throw unprocessable(`${field.label} is recorded through its own action, not as a value`)
    if (field.editable === false || field.retired) throw unprocessable(`${field.label} is not editable`)
    const value = await validateFieldValue(ctx.orgId, workflow.definition, field, rawValue)
    const previous = await db.opportunityFieldValue.findUnique({ where: { opportunityId_fieldId: { opportunityId: id, fieldId } } })
    await transaction(async (tx) => {
      if (value === null) {
        await tx.opportunityFieldValue.deleteMany({ where: { opportunityId: id, fieldId } })
      } else {
        await tx.opportunityFieldValue.upsert({
          where: { opportunityId_fieldId: { opportunityId: id, fieldId } },
          create: { organizationId: ctx.orgId, opportunityId: id, fieldId, value: value as Prisma.InputJsonValue, workflowVersionId: workflow.version.id, updatedById: ctx.userId },
          update: { value: value as Prisma.InputJsonValue, workflowVersionId: workflow.version.id, updatedById: ctx.userId },
        })
      }
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'field.changed',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        contactId: opp.contactId,
        opportunityId: id,
        stageId: workflow.definition.stages.find((s) => s.fieldIds.includes(fieldId))?.id ?? opp.stageId,
        workflowVersionId: workflow.version.id,
        payload: { changes: [{ fieldId, from: previous?.value ?? null, to: value }] } as unknown as Prisma.InputJsonValue,
      })
    })
    return { fieldId, value }
  }

  /** Manual stage change, forward or backward, never gated by fields or checklists. */
  async transition(auth: AuthContext, id: string, input: { toStageId: string; reason?: string | null; idempotencyKey: string }) {
    const ctx = requireOrg(auth)
    const existing = await findTransitionByKey(id, input.idempotencyKey)
    if (existing && existing.organizationId === ctx.orgId) return this.transitionResult(existing.id)
    const opp = await loadOpportunity(ctx, id)
    const workflow = await currentWorkflow(ctx.orgId)
    const target = workflow.definition.stages.find((s) => s.id === input.toStageId)
    if (!target) throw unprocessable('Unknown stage')
    if (target.retired) throw unprocessable(`${target.label} has been retired`)
    if (target.id === opp.stageId) throw unprocessable(`This job is already in ${target.label}`)
    const from = workflow.definition.stages.find((s) => s.id === opp.stageId)
    const kind = from && target.order < from.order ? 'BACKWARD' : 'FORWARD'
    try {
      const t = await transaction(async (tx) => {
        // Conditional update: a concurrent move from the same starting stage wins once.
        const moved = await tx.opportunity.updateMany({
          where: { id, organizationId: ctx.orgId, stageId: opp.stageId },
          data: { stageId: target.id, stageEnteredAt: new Date(), workflowVersionId: workflow.version.id },
        })
        if (moved.count === 0) throw unprocessable('This job was just moved by someone else. Refresh to see its current stage.')
        const row = await tx.stageTransition.create({
          data: {
            organizationId: ctx.orgId,
            opportunityId: id,
            workflowVersionId: workflow.version.id,
            kind,
            fromStageId: opp.stageId,
            toStageId: target.id,
            reason: input.reason?.trim() || null,
            actorId: ctx.userId,
            idempotencyKey: input.idempotencyKey,
            occurredAt: new Date(),
          },
        })
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'stage.changed',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: opp.contactId,
          opportunityId: id,
          stageId: target.id,
          workflowVersionId: workflow.version.id,
          note: input.reason?.trim() || null,
          payload: { fromStageId: opp.stageId, toStageId: target.id, kind },
        })
        return row
      })
      return this.transitionResult(t.id)
    } catch (err) {
      if (isUniqueViolation(err)) {
        const again = await findTransitionByKey(id, input.idempotencyKey)
        if (again) return this.transitionResult(again.id)
      }
      throw err
    }
  }

  async setStatus(auth: AuthContext, id: string, input: { status: OpportunityStatus; reason?: string | null; idempotencyKey: string }) {
    const ctx = requireOrg(auth)
    const existing = await findTransitionByKey(id, input.idempotencyKey)
    if (existing && existing.organizationId === ctx.orgId) return this.transitionResult(existing.id)
    const opp = await loadOpportunity(ctx, id)
    if (opp.status === input.status) throw unprocessable(`This job is already ${input.status.toLowerCase().replace('_', ' ')}`)
    const reason = input.reason?.trim() || null
    if ((input.status === 'LOST' || input.status === 'CANCELED') && !reason)
      throw unprocessable('Add a short reason when marking a job lost or canceled')
    const workflow = await currentWorkflow(ctx.orgId)
    const t = await transaction(async (tx) => {
      await tx.opportunity.update({ where: { id }, data: { status: input.status, statusReason: reason } })
      const row = await tx.stageTransition.create({
        data: {
          organizationId: ctx.orgId,
          opportunityId: id,
          workflowVersionId: workflow.version.id,
          kind: 'STATUS',
          fromStageId: opp.stageId,
          toStageId: opp.stageId,
          fromStatus: opp.status,
          toStatus: input.status,
          reason,
          actorId: ctx.userId,
          idempotencyKey: input.idempotencyKey,
          occurredAt: new Date(),
        },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'status.changed',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        contactId: opp.contactId,
        opportunityId: id,
        stageId: opp.stageId,
        workflowVersionId: workflow.version.id,
        note: reason,
        payload: { fromStatus: opp.status, toStatus: input.status },
      })
      return row
    })
    return this.transitionResult(t.id)
  }

  private async transitionResult(id: string) {
    const t = await db.stageTransition.findUniqueOrThrow({ where: { id } })
    const actor = t.actorId ? await db.user.findUnique({ where: { id: t.actorId }, select: userSummarySelect }) : null
    return transitionOut(t, actor)
  }

  private async summary(id: string) {
    return opportunitySummary(await db.opportunity.findUniqueOrThrow({ where: { id }, include: opportunitySummaryInclude }))
  }
}

async function attentionFilter(organizationId: string, attention: Attention | undefined): Promise<Prisma.OpportunityWhereInput> {
  const now = new Date()
  switch (attention) {
    case 'overdue':
      return { nextFollowUpAt: { lt: now } }
    case 'quiet':
      return { lastActivityAt: { lt: new Date(now.getTime() - QUIET_DAYS * DAY) } }
    case 'upcoming':
      return { appointments: { some: { status: 'SCHEDULED', startsAt: { gte: new Date(now.getTime() - DAY), lte: new Date(now.getTime() + UPCOMING_DAYS * DAY) } } } }
    case 'no_outreach': {
      // New leads nobody has called, texted or emailed yet.
      const { definition } = await currentWorkflow(organizationId)
      const contacted = await db.activityEvent.findMany({
        where: { organizationId, type: { in: ['contact.attempt', 'email.message', 'review.requested'] }, opportunityId: { not: null } },
        select: { opportunityId: true },
        distinct: ['opportunityId'],
      })
      return { stageId: firstStageId(definition), id: { notIn: contacted.length ? contacted.map((c) => c.opportunityId!) : ['-'] } }
    }
    default:
      return {}
  }
}

/** Members may claim an unassigned job for themselves; reassigning is a manager action. */
function assertCanAssign(ctx: OrgContext, currentOwnerId: string | null, nextOwnerId: string | null) {
  if (hasPermission(ctx, 'jobs.assign_any')) return
  const selfClaim = currentOwnerId === null && nextOwnerId === ctx.userId
  if (!selfClaim) throw forbidden('Only managers can reassign jobs')
}

/**
 * Normalises a PATCH body against the stored job: trims text (blank → null, but a blank
 * title is ignored), parses dates, and keeps only real changes. Returns the column update
 * and the `job.updated` change list (owner changes are logged as their own event).
 */
function diffNativeFields(definition: WorkflowDefinition, before: Record<keyof UpdateInput, unknown>, input: UpdateInput) {
  const data: Prisma.OpportunityUncheckedUpdateInput = {}
  const changes: { fieldId: string; from: unknown; to: unknown }[] = []
  for (const key of Object.keys(input) as (keyof UpdateInput)[]) {
    let value = input[key] as unknown
    if (value === undefined) continue
    if (typeof value === 'string' && key !== 'ownerId') value = value.trim() || null
    if (key === 'title' && value === null) continue
    if (key === 'nextFollowUpAt' && value) value = new Date(value as string)
    const prev = before[key]
    if (sameValue(prev, value)) continue
    ;(data as Record<string, unknown>)[key] = value
    if (key !== 'ownerId') changes.push({ fieldId: fieldIdForBinding(definition, NATIVE_FIELD_OF[key]), from: prev ?? null, to: value ?? null })
  }
  return { data, changes }
}

function sameValue(prev: unknown, next: unknown) {
  return prev instanceof Date && next instanceof Date ? prev.getTime() === next.getTime() : (prev ?? null) === (next ?? null)
}

function findTransitionByKey(opportunityId: string, idempotencyKey: string) {
  return db.stageTransition.findUnique({ where: { opportunityId_idempotencyKey: { opportunityId, idempotencyKey } } })
}

export function appointmentOut(
  a: {
    id: string
    opportunityId: string
    stageId: string
    kind: string
    startsAt: Date
    endsAt: Date | null
    status: string
    assigneeUserId: string | null
    notes: string | null
    externalPerson: Parameters<typeof externalPersonOut>[0]
  },
  people: Map<string, Parameters<typeof userSummary>[0] & {}>,
) {
  return {
    id: a.id,
    opportunityId: a.opportunityId,
    stageId: a.stageId,
    kind: a.kind,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    status: a.status,
    assignee: userSummary(a.assigneeUserId ? people.get(a.assigneeUserId) : null),
    externalPerson: externalPersonOut(a.externalPerson),
    notes: a.notes,
  }
}

export function externalLinkOut(l: {
  id: string
  kind: string
  label: string
  url: string | null
  amountCents: number | null
  statusLabel: string | null
  provenance: string
  statusRecordedAt: Date | null
  createdAt: Date
}) {
  return {
    id: l.id,
    kind: l.kind,
    label: l.label,
    url: l.url,
    amountCents: l.amountCents,
    statusLabel: l.statusLabel,
    provenance: l.provenance,
    statusRecordedAt: l.statusRecordedAt,
    createdAt: l.createdAt,
  }
}
