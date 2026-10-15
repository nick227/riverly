import { db } from '@project/db'
import { activeStages, optionLabel } from '@project/shared'
import { requirePermission, type AuthContext } from '../lib/context'
import { opportunitySummary, opportunitySummaryInclude, userSummary, userSummarySelect } from '../lib/serialize'
import { currentWorkflow, firstStageId } from '../lib/workflow'
import { appointmentOut } from './OpportunityService'

const DAY = 24 * 60 * 60 * 1000
const ACTIVE = { in: ['OPEN', 'WON'] as ('OPEN' | 'WON')[] }

export class ManageService {
  async overview(auth: AuthContext, staleDays = 7) {
    const ctx = requirePermission(auth, 'manage.view')
    const now = new Date()
    const { definition } = await currentWorkflow(ctx.orgId)
    const first = firstStageId(definition)
    const base = { organizationId: ctx.orgId, deletedAt: null, status: ACTIVE }
    const contacted = await db.activityEvent.findMany({
      where: { organizationId: ctx.orgId, type: { in: ['contact.attempt', 'email.message', 'review.requested'] }, opportunityId: { not: null } },
      select: { opportunityId: true },
      distinct: ['opportunityId'],
    })
    const contactedIds = contacted.map((c) => c.opportunityId!)
    const [openJobs, unassigned, noOutreach, stale, overdue, appointments, members] = await Promise.all([
      db.opportunity.count({ where: base }),
      db.opportunity.findMany({ where: { ...base, ownerId: null }, include: opportunitySummaryInclude, orderBy: { leadReceivedAt: 'asc' }, take: 25 }),
      db.opportunity.findMany({
        where: { ...base, stageId: first, id: { notIn: contactedIds.length ? contactedIds : ['-'] } },
        include: opportunitySummaryInclude,
        orderBy: { leadReceivedAt: 'asc' },
        take: 25,
      }),
      db.opportunity.findMany({
        where: { ...base, lastActivityAt: { lt: new Date(now.getTime() - staleDays * DAY) } },
        include: opportunitySummaryInclude,
        orderBy: { lastActivityAt: 'asc' },
        take: 25,
      }),
      db.opportunity.findMany({
        where: { ...base, nextFollowUpAt: { lt: now } },
        include: opportunitySummaryInclude,
        orderBy: { nextFollowUpAt: 'asc' },
        take: 25,
      }),
      db.appointment.findMany({
        where: { organizationId: ctx.orgId, status: 'SCHEDULED', startsAt: { gte: new Date(now.getTime() - DAY), lte: new Date(now.getTime() + 14 * DAY) } },
        include: { externalPerson: true, opportunity: { include: { contact: { select: { name: true } } } } },
        orderBy: { startsAt: 'asc' },
        take: 25,
      }),
      db.membership.findMany({ where: { organizationId: ctx.orgId, status: 'ACTIVE' }, include: { user: { select: userSummarySelect } } }),
    ])
    const weekAgo = new Date(now.getTime() - 7 * DAY)
    const [openByOwner, overdueByOwner, staleByOwner, attemptsByActor] = await Promise.all([
      db.opportunity.groupBy({ by: ['ownerId'], where: base, _count: true }),
      db.opportunity.groupBy({ by: ['ownerId'], where: { ...base, nextFollowUpAt: { lt: now } }, _count: true }),
      db.opportunity.groupBy({ by: ['ownerId'], where: { ...base, lastActivityAt: { lt: new Date(now.getTime() - staleDays * DAY) } }, _count: true }),
      db.activityEvent.groupBy({ by: ['actorId'], where: { organizationId: ctx.orgId, type: 'contact.attempt', occurredAt: { gte: weekAgo } }, _count: true }),
    ])
    const count = (rows: { _count: number; [k: string]: unknown }[], key: string, id: string) =>
      rows.find((r) => r[key] === id)?._count ?? 0
    const people = new Map(members.map((m) => [m.userId, m.user]))
    return {
      openJobs,
      staleDays,
      unassignedLeads: unassigned.map(opportunitySummary),
      noOutreachYet: noOutreach.map(opportunitySummary),
      staleJobs: stale.map(opportunitySummary),
      overdueFollowUps: overdue.map(opportunitySummary),
      upcomingAppointments: appointments.map((a) => ({
        ...appointmentOut(a, people),
        contactName: a.opportunity.contact.name,
        jobTitle: a.opportunity.title,
      })),
      workload: members
        .map((m) => ({
          owner: userSummary(m.user)!,
          openJobs: count(openByOwner, 'ownerId', m.userId),
          overdueFollowUps: count(overdueByOwner, 'ownerId', m.userId),
          attempts7d: count(attemptsByActor, 'actorId', m.userId),
          staleJobs: count(staleByOwner, 'ownerId', m.userId),
        }))
        .sort((a, b) => b.openJobs - a.openJobs),
    }
  }

  /** Pipeline report grouped by stable stage/option/user IDs; labels come from current config. */
  async pipeline(auth: AuthContext, q: { from?: string; to?: string }) {
    const ctx = requirePermission(auth, 'reports.view')
    const { definition } = await currentWorkflow(ctx.orgId)
    const to = q.to ? new Date(q.to) : new Date()
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 90 * DAY)
    const base = { organizationId: ctx.orgId, deletedAt: null }
    const active = { ...base, status: ACTIVE }
    const [stageRows, ownerRows, sourceRows, cohort, members, values] = await Promise.all([
      db.opportunity.findMany({ where: active, select: { stageId: true, stageEnteredAt: true } }),
      db.opportunity.groupBy({ by: ['ownerId'], where: active, _count: true, _sum: { estimatedValueCents: true } }),
      db.opportunity.groupBy({ by: ['leadSourceOptionId'], where: { ...base, leadReceivedAt: { gte: from, lte: to } }, _count: true, _sum: { contractValueCents: true } }),
      db.opportunity.findMany({ where: { ...base, leadReceivedAt: { gte: from, lte: to } }, select: { id: true } }),
      db.membership.findMany({ where: { organizationId: ctx.orgId }, include: { user: { select: { id: true, displayName: true } } } }),
      db.opportunity.aggregate({ where: active, _sum: { estimatedValueCents: true } }),
    ])
    const contracted = await db.opportunity.aggregate({
      where: { ...base, contractValueCents: { not: null } },
      _sum: { contractValueCents: true },
      _count: true,
    })
    const reached = cohort.length
      ? await db.stageTransition.findMany({
          where: { organizationId: ctx.orgId, opportunityId: { in: cohort.map((c) => c.id) }, kind: { in: ['FORWARD', 'ADMIN_MAPPING'] } },
          select: { opportunityId: true, toStageId: true },
          distinct: ['opportunityId', 'toStageId'],
        })
      : []
    const stages = definition.stages.slice().sort((a, b) => a.order - b.order)
    const now = Date.now()
    const byStage = stages
      .map((s) => {
        const inStage = stageRows.filter((r) => r.stageId === s.id)
        return {
          key: s.id,
          label: s.retired ? `${s.label} (retired)` : s.label,
          count: inStage.length,
          avgDays: inStage.length ? round(inStage.reduce((sum, r) => sum + (now - r.stageEnteredAt.getTime()) / DAY, 0) / inStage.length) : 0,
        }
      })
      .filter((r) => r.count > 0 || !stages.find((s) => s.id === r.key)?.retired)
    const names = new Map(members.map((m) => [m.userId, m.user.displayName]))
    const leadField = definition.fields.find((f) => f.binding === 'opportunity.leadSourceOptionId')
    const missingSource = await db.opportunity.count({ where: { ...active, leadSourceOptionId: null } })
    const missingOwner = await db.opportunity.count({ where: { ...active, ownerId: null } })
    const missingFollowUp = await db.opportunity.count({ where: { ...active, nextFollowUpAt: null } })
    return {
      generatedAt: new Date(),
      definitions: {
        byStage: 'Open and won jobs by their current stage ID. avgDays = days since the job entered that stage.',
        byOwner: 'Open and won jobs by assigned salesperson. "Unassigned" has no owner.',
        bySource: `Jobs whose lead arrived between ${from.toISOString().slice(0, 10)} and ${to.toISOString().slice(0, 10)}, by lead source option ID. valueCents = manually entered contract value (not revenue received).`,
        reachedStage: 'Of the jobs in the same lead window, how many have ever moved into each stage (forward moves only). Uses stage IDs, so renaming a stage does not change history.',
        valueSummary: 'Estimated and contract values are manually entered and unverified. They are not cash collected.',
      },
      byStage,
      byOwner: ownerRows
        .map((r) => ({ key: r.ownerId, label: r.ownerId ? names.get(r.ownerId) ?? 'Former member' : 'Unassigned', count: r._count, valueCents: r._sum.estimatedValueCents ?? 0 }))
        .sort((a, b) => b.count - a.count),
      bySource: sourceRows
        .map((r) => ({
          key: r.leadSourceOptionId,
          label: r.leadSourceOptionId && leadField ? optionLabel(definition, leadField.id, r.leadSourceOptionId) ?? r.leadSourceOptionId : 'Not recorded',
          count: r._count,
          valueCents: r._sum.contractValueCents ?? 0,
        }))
        .sort((a, b) => b.count - a.count),
      reachedStage: activeStages(definition).map((s) => ({
        key: s.id,
        label: s.label,
        count: new Set(reached.filter((r) => r.toStageId === s.id).map((r) => r.opportunityId)).size,
      })),
      valueSummary: {
        estimatedOpenCents: values._sum.estimatedValueCents ?? 0,
        contractedCents: contracted._sum.contractValueCents ?? 0,
        contractedJobs: contracted._count,
      },
      dataQuality: { missingSource, missingOwner, missingFollowUp },
    }
  }

  async activity(auth: AuthContext, q: { from?: string; to?: string }) {
    const ctx = requirePermission(auth, 'reports.view')
    const { definition } = await currentWorkflow(ctx.orgId)
    const to = q.to ? new Date(q.to) : new Date()
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * DAY)
    const window = { organizationId: ctx.orgId, occurredAt: { gte: from, lte: to } }
    const [byType, byMethod, byOutcome, byActor, verification, members, leads, inspectionsBooked] = await Promise.all([
      db.activityEvent.groupBy({ by: ['type'], where: window, _count: true }),
      db.activityEvent.groupBy({ by: ['methodId'], where: { ...window, type: 'contact.attempt' }, _count: true }),
      db.activityEvent.groupBy({ by: ['outcomeId'], where: { ...window, type: 'contact.attempt' }, _count: true }),
      db.activityEvent.groupBy({ by: ['actorId'], where: { ...window, type: 'contact.attempt' }, _count: true }),
      db.activityEvent.groupBy({ by: ['verification'], where: { ...window, actorType: 'USER' }, _count: true }),
      db.membership.findMany({ where: { organizationId: ctx.orgId }, include: { user: { select: { id: true, displayName: true } } } }),
      db.opportunity.findMany({
        where: { organizationId: ctx.orgId, deletedAt: null, leadReceivedAt: { gte: from, lte: to } },
        select: { id: true, leadReceivedAt: true },
      }),
      db.appointment.count({ where: { organizationId: ctx.orgId, createdAt: { gte: from, lte: to }, kind: 'inspection' } }),
    ])
    // First outreach: any logged attempt or queued email vs. provider-accepted email only.
    const ids = leads.map((l) => l.id)
    const [attempts, messages] = ids.length
      ? await Promise.all([
          db.activityEvent.groupBy({ by: ['opportunityId'], where: { organizationId: ctx.orgId, opportunityId: { in: ids }, type: 'contact.attempt' }, _min: { occurredAt: true } }),
          db.outboundMessage.findMany({ where: { organizationId: ctx.orgId, opportunityId: { in: ids } }, select: { opportunityId: true, queuedAt: true, sentAt: true, provider: true } }),
        ])
      : [[], []]
    const anyMinutes: number[] = []
    const verifiedMinutes: number[] = []
    for (const lead of leads) {
      const times = [
        attempts.find((a) => a.opportunityId === lead.id)?._min.occurredAt,
        ...messages.filter((m) => m.opportunityId === lead.id).map((m) => m.queuedAt),
      ].filter((t): t is Date => !!t)
      if (times.length) anyMinutes.push((Math.min(...times.map((t) => t.getTime())) - lead.leadReceivedAt.getTime()) / 60000)
      const verified = messages
        .filter((m) => m.opportunityId === lead.id && m.provider !== 'DEV_LOG' && m.sentAt)
        .map((m) => m.sentAt!.getTime())
      if (verified.length) verifiedMinutes.push((Math.min(...verified) - lead.leadReceivedAt.getTime()) / 60000)
    }
    const names = new Map(members.map((m) => [m.userId, m.user.displayName]))
    const label = (list: { id: string; label: string }[], id: string | null) => (id ? list.find((o) => o.id === id)?.label ?? id : 'Not recorded')
    return {
      from,
      to,
      definitions: {
        contactAttempts: 'Contact attempts are logged by people (self-reported). They are not proof that a call happened.',
        verification: 'SELF_REPORTED = a person logged it; SYSTEM_RECORDED = Riverly performed it; PROVIDER_VERIFIED = an external provider confirmed it.',
        firstOutreach: 'Minutes from lead received to the first logged attempt or queued email (any), and to the first email accepted by a real email provider (verified). Development-transport emails are never counted as verified.',
        inspectionsBooked: 'Inspection appointments created in the window.',
      },
      byType: byType.map((r) => ({ key: r.type, label: r.type, count: r._count })).sort((a, b) => b.count - a.count),
      contactAttempts: {
        byMethod: byMethod.map((r) => ({ key: r.methodId, label: label(definition.activity.methods, r.methodId), count: r._count })),
        byOutcome: byOutcome.map((r) => ({ key: r.outcomeId, label: label(definition.activity.outcomes, r.outcomeId), count: r._count })),
        byActor: byActor.map((r) => ({ key: r.actorId, label: r.actorId ? names.get(r.actorId) ?? 'Former member' : 'System', count: r._count })),
      },
      verification: verification.map((r) => ({ key: r.verification, label: r.verification, count: r._count })),
      firstOutreach: {
        leads: leads.length,
        reached: anyMinutes.length,
        medianMinutesAny: median(anyMinutes),
        medianMinutesVerified: median(verifiedMinutes),
        verifiedSample: verifiedMinutes.length,
      },
      inspectionsBooked,
    }
  }

  async workerRuns(auth: AuthContext) {
    const ctx = requirePermission(auth, 'diagnostics.view')
    const rows = await db.workerRun.findMany({ where: { organizationId: ctx.orgId }, orderBy: { startedAt: 'desc' }, take: 50 })
    return rows.map((r) => ({ id: r.id, kind: r.kind, status: r.status, error: r.error, startedAt: r.startedAt, finishedAt: r.finishedAt, detail: r.detail }))
  }
}

function median(values: number[]) {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return round(s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2)
}

const round = (n: number) => Math.round(n * 10) / 10
