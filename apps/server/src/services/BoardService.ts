import { db } from '@project/db'
import type { WorkflowDefinition } from '@project/shared'
import { requireOrg, type AuthContext } from '../lib/context'
import { boardWindow, type BoardPeriod } from '../lib/periods'
import { userSummary, userSummarySelect } from '../lib/serialize'
import { currentWorkflow, firstStageId } from '../lib/workflow'

// Roofing template IDs (stable across label edits): a sale is a signed contract, a call is a
// contact attempt logged with the phone method.
const SALE_STAGE_ID = 'contract'
const CALL_METHOD_ID = 'phone'
const LEADERS = 5

type Sale = { opportunityId: string; title: string; contactName: string; userId: string | null; valueCents: number | null }

/**
 * Live sales board for the Activity page: running totals for today or this week in the
 * company's timezone, with the same span earlier for comparison. Visible to every member.
 */
export class BoardService {
  async board(auth: AuthContext, period: BoardPeriod = 'today', now = new Date()) {
    const ctx = requireOrg(auth)
    const [org, { definition }] = await Promise.all([
      db.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: { timezone: true } }),
      currentWorkflow(ctx.orgId),
    ])
    const window = boardWindow(period, now, org.timezone)
    const saleStageIds = saleStages(definition)
    const [current, previous, openLeads, inspectionsPending, members] = await Promise.all([
      tally(ctx.orgId, window.from, window.to, saleStageIds),
      tally(ctx.orgId, window.previous.from, window.previous.to, saleStageIds),
      db.opportunity.count({ where: { organizationId: ctx.orgId, deletedAt: null, status: 'OPEN', stageId: firstStageId(definition) } }),
      db.appointment.count({ where: { organizationId: ctx.orgId, kind: 'inspection', status: 'SCHEDULED', opportunity: { deletedAt: null } } }),
      db.membership.findMany({ where: { organizationId: ctx.orgId, status: 'ACTIVE' }, include: { user: { select: userSummarySelect } } }),
    ])
    const people = new Map(members.map((m) => [m.userId, m.user]))
    const top = current.sales.filter((s) => s.valueCents !== null).sort((a, b) => b.valueCents! - a.valueCents!)[0]
    return {
      period,
      timezone: org.timezone,
      from: window.from,
      to: window.to,
      metrics: { ...totals(current), openLeads, inspectionsPending },
      previous: totals(previous),
      topSale: top
        ? { opportunityId: top.opportunityId, title: top.title, contactName: top.contactName, valueCents: top.valueCents!, owner: userSummary(top.userId ? people.get(top.userId) : null) }
        : null,
      leaders: leaders(current, people),
    }
  }
}

/** The contract stage and every active stage after it (a job can skip straight past it). */
function saleStages(def: WorkflowDefinition) {
  const contract = def.stages.find((s) => s.id === SALE_STAGE_ID)
  if (!contract) return []
  return def.stages.filter((s) => s.order >= contract.order).map((s) => s.id)
}

async function tally(organizationId: string, from: Date, to: Date, saleStageIds: string[]) {
  const occurred = { gte: from, lt: to }
  const [callsByUser, newLeads, inspectionsBooked, sales] = await Promise.all([
    db.activityEvent.groupBy({ by: ['actorId'], where: { organizationId, type: 'contact.attempt', methodId: CALL_METHOD_ID, occurredAt: occurred }, _count: true }),
    db.opportunity.count({ where: { organizationId, deletedAt: null, leadReceivedAt: occurred } }),
    db.appointment.count({ where: { organizationId, kind: 'inspection', createdAt: occurred, opportunity: { deletedAt: null } } }),
    salesBetween(organizationId, from, to, saleStageIds),
  ])
  return { calls: new Map(callsByUser.map((r) => [r.actorId, r._count])), newLeads, inspectionsBooked, sales }
}

/**
 * Jobs that moved forward into a sale stage for the first time in the window. A job moved
 * back and forward again counts once, on its first signing. Credited to the job's owner
 * (the salesperson), or to whoever moved it when the job is unassigned.
 */
async function salesBetween(organizationId: string, from: Date, to: Date, saleStageIds: string[]): Promise<Sale[]> {
  if (!saleStageIds.length) return []
  const signed = { organizationId, kind: 'FORWARD' as const, toStageId: { in: saleStageIds } }
  const moves = await db.stageTransition.findMany({
    where: { ...signed, occurredAt: { gte: from, lt: to }, opportunity: { deletedAt: null } },
    select: { opportunityId: true, actorId: true },
    orderBy: { occurredAt: 'asc' },
  })
  const firstMover = new Map<string, string | null>()
  for (const m of moves) if (!firstMover.has(m.opportunityId)) firstMover.set(m.opportunityId, m.actorId)
  if (!firstMover.size) return []
  const ids = [...firstMover.keys()]
  const [earlier, jobs] = await Promise.all([
    db.stageTransition.findMany({ where: { ...signed, opportunityId: { in: ids }, occurredAt: { lt: from } }, select: { opportunityId: true }, distinct: ['opportunityId'] }),
    db.opportunity.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, ownerId: true, contractValueCents: true, contact: { select: { name: true } } } }),
  ])
  const signedBefore = new Set(earlier.map((e) => e.opportunityId))
  return jobs
    .filter((j) => !signedBefore.has(j.id))
    .map((j) => ({ opportunityId: j.id, title: j.title, contactName: j.contact.name, userId: j.ownerId ?? firstMover.get(j.id) ?? null, valueCents: j.contractValueCents }))
}

function totals(t: Awaited<ReturnType<typeof tally>>) {
  return {
    calls: [...t.calls.values()].reduce((a, b) => a + b, 0),
    sales: t.sales.length,
    salesValueCents: t.sales.reduce((sum, s) => sum + (s.valueCents ?? 0), 0),
    newLeads: t.newLeads,
    inspectionsBooked: t.inspectionsBooked,
  }
}

/** Top members by sales value, then number of sales, then calls. Only people on the board. */
function leaders(t: Awaited<ReturnType<typeof tally>>, people: Map<string, Parameters<typeof userSummary>[0]>) {
  const rows = new Map<string, { sales: number; salesValueCents: number; calls: number }>()
  const row = (id: string) => rows.get(id) ?? rows.set(id, { sales: 0, salesValueCents: 0, calls: 0 }).get(id)!
  for (const s of t.sales) {
    if (!s.userId) continue
    row(s.userId).sales++
    row(s.userId).salesValueCents += s.valueCents ?? 0
  }
  for (const [id, calls] of t.calls) if (id) row(id).calls += calls
  return [...rows.entries()]
    .filter(([id]) => people.has(id))
    .map(([id, r]) => ({ user: userSummary(people.get(id))!, ...r }))
    .sort((a, b) => b.salesValueCents - a.salesValueCents || b.sales - a.sales || b.calls - a.calls)
    .slice(0, LEADERS)
}
