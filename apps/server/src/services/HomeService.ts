import { db, type Prisma } from '@project/db'
import { activeStages } from '@project/shared'
import { opportunityScope } from '../lib/access'
import { requireOrg, type AuthContext, type OrgContext } from '../lib/context'
import { startOfLocalDay } from '../lib/periods'
import { currentWorkflow } from '../lib/workflow'
import { CALL_METHOD_ID, saleStages } from './BoardService'
import { attentionFilter } from './OpportunityService'

const ACTIVE = { in: ['OPEN', 'WON'] as ('OPEN' | 'WON')[] }
const DAY = 24 * 60 * 60 * 1000
const MAX_TASKS = 12

type TaskKind = 'follow_up' | 'first_call' | 'visit' | 'quiet'
type Task = { kind: TaskKind; opportunityId: string; contactName: string; title: string; at: Date }

/**
 * Numbers for the company home page: active jobs per stage, what is waiting right now (the same rules as the Contacts
 * "Needs attention" filters, so the links land on matching lists), all-time company totals and
 * the signed-in member's own totals. Visible to every member.
 */
export class HomeService {
  async home(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const [org, { definition }] = await Promise.all([
      db.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { createdAt: true, timezone: true } }),
      currentWorkflow(ctx.orgId),
    ])
    const sale = saleStages(definition)
    const finalStage = activeStages(definition).at(-1)?.id
    const stages = { sale, final: finalStage ? [finalStage] : [] }
    const [tasks, byStage, waiting, company, you, contacts, leads, openJobs] = await Promise.all([
      this.tasks(ctx, org.timezone),
      db.opportunity.groupBy({ by: ['stageId'], where: { ...opportunityScope(ctx), status: ACTIVE }, _count: true }),
      this.waiting(ctx),
      totals(ctx.orgId, stages),
      totals(ctx.orgId, stages, ctx.userId),
      db.contact.count({ where: { organizationId: ctx.orgId, deletedAt: null } }),
      db.opportunity.count({ where: opportunityScope(ctx) }),
      db.opportunity.count({ where: { ...opportunityScope(ctx), status: ACTIVE, ownerId: ctx.userId } }),
    ])
    const counts = new Map(byStage.map((r) => [r.stageId, r._count]))
    const stageCounts = activeStages(definition).map((st) => ({ stageId: st.id, count: counts.get(st.id) ?? 0 }))
    return { since: org.createdAt, tasks, stages: stageCounts, waiting, company: { ...company, contacts, leads }, you: { ...you, openJobs } }
  }

  /** The viewer's own to-do list, most urgent first; each job appears once, under its first kind. */
  private async tasks(ctx: OrgContext, timezone: string, now = new Date()): Promise<Task[]> {
    const mine = { ...opportunityScope(ctx), status: ACTIVE, ownerId: ctx.userId }
    const endOfToday = new Date(startOfLocalDay(now, timezone).getTime() + DAY)
    const job = { select: { id: true, title: true, contact: { select: { name: true } } } } as const
    const [followUps, firstCalls, visits, quiet] = await Promise.all([
      db.opportunity.findMany({ where: { ...mine, nextFollowUpAt: { lt: endOfToday } }, select: { ...job.select, nextFollowUpAt: true }, orderBy: { nextFollowUpAt: 'asc' }, take: MAX_TASKS }),
      attentionFilter(ctx.orgId, 'no_outreach').then((f) =>
        db.opportunity.findMany({ where: { AND: [mine, f] }, select: { ...job.select, leadReceivedAt: true }, orderBy: { leadReceivedAt: 'asc' }, take: MAX_TASKS }),
      ),
      db.appointment.findMany({
        where: {
          organizationId: ctx.orgId,
          status: 'SCHEDULED',
          startsAt: { gte: new Date(now.getTime() - DAY / 2), lt: new Date(endOfToday.getTime() + 7 * DAY) },
          opportunity: { deletedAt: null },
          OR: [{ assigneeUserId: ctx.userId }, { opportunity: { ownerId: ctx.userId } }],
        },
        select: { startsAt: true, opportunity: job },
        orderBy: { startsAt: 'asc' },
        take: MAX_TASKS,
      }),
      db.opportunity.findMany({ where: { ...mine, lastActivityAt: { lt: new Date(now.getTime() - 7 * DAY) } }, select: { ...job.select, lastActivityAt: true }, orderBy: { lastActivityAt: 'asc' }, take: MAX_TASKS }),
    ])
    const out: Task[] = []
    const seen = new Set<string>()
    const add = (kind: TaskKind, j: { id: string; title: string; contact: { name: string } }, at: Date) => {
      if (seen.has(j.id) || out.length >= MAX_TASKS) return
      seen.add(j.id)
      out.push({ kind, opportunityId: j.id, contactName: j.contact.name, title: j.title, at })
    }
    for (const j of followUps) add('follow_up', j, j.nextFollowUpAt!)
    for (const j of firstCalls) add('first_call', j, j.leadReceivedAt)
    for (const v of visits) add('visit', v.opportunity, v.startsAt)
    for (const j of quiet) add('quiet', j, j.lastActivityAt)
    return out
  }

  private async waiting(ctx: OrgContext) {
    const base = { ...opportunityScope(ctx), status: ACTIVE }
    const count = async (attention: Parameters<typeof attentionFilter>[1]) =>
      db.opportunity.count({ where: { AND: [base, await attentionFilter(ctx.orgId, attention)] } })
    const [notContacted, overdueFollowUps, upcomingAppointments, quiet] = await Promise.all([count('no_outreach'), count('overdue'), count('upcoming'), count('quiet')])
    return { notContacted, overdueFollowUps, upcomingAppointments, quiet }
  }
}

/** All-time totals for the company, or credited to one member when `userId` is given. */
async function totals(organizationId: string, stages: { sale: string[]; final: string[] }, userId?: string) {
  const job = { organizationId, deletedAt: null }
  const reached = (stageIds: string[]): Prisma.OpportunityWhereInput => ({
    ...job,
    ...(userId ? { ownerId: userId } : {}),
    stageTransitions: { some: { kind: 'FORWARD', toStageId: { in: stageIds.length ? stageIds : ['-'] } } },
  })
  const [calls, inspectionsBooked, sales, completed, reviewsRequested] = await Promise.all([
    db.activityEvent.count({ where: { organizationId, type: 'contact.attempt', methodId: CALL_METHOD_ID, ...(userId ? { actorId: userId } : {}) } }),
    db.appointment.count({ where: { organizationId, kind: 'inspection', opportunity: { deletedAt: null }, ...(userId ? { createdById: userId } : {}) } }),
    db.opportunity.aggregate({ where: reached(stages.sale), _count: true, _sum: { contractValueCents: true } }),
    db.opportunity.count({ where: reached(stages.final) }),
    db.reviewRequest.count({ where: { organizationId, opportunity: { deletedAt: null }, ...(userId ? { createdById: userId } : {}) } }),
  ])
  return { calls, inspectionsBooked, sales: sales._count, salesValueCents: sales._sum.contractValueCents ?? 0, completed, reviewsRequested }
}
