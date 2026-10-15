import { db } from '@project/db'
import type { OrgContext } from './context'
import { notFound, unprocessable } from './errors'

// Record-scope policy. V1 decision: every active member can read and work every job in their
// company. Assigned-only visibility can be introduced here without touching services.
export function opportunityScope(ctx: OrgContext) {
  return { organizationId: ctx.orgId, deletedAt: null }
}

export async function loadOpportunity(ctx: OrgContext, id: string) {
  const opp = await db.opportunity.findFirst({ where: { id, ...opportunityScope(ctx) } })
  if (!opp) throw notFound('Job')
  return opp
}

export async function loadContact(ctx: OrgContext, id: string) {
  const contact = await db.contact.findFirst({ where: { id, organizationId: ctx.orgId, deletedAt: null } })
  if (!contact) throw notFound('Contact')
  return contact
}

export async function assertActiveMember(organizationId: string, userId: string) {
  const m = await db.membership.findUnique({ where: { organizationId_userId: { organizationId, userId } } })
  if (!m || m.status !== 'ACTIVE') throw unprocessable('That person is not an active member of this company')
  return m
}

export async function assertExternalPerson(organizationId: string, id: string) {
  const p = await db.externalPerson.findFirst({ where: { id, organizationId } })
  if (!p) throw unprocessable('Unknown external person')
  return p
}
