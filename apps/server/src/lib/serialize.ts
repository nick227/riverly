import type { Contact, Opportunity, User, StageTransition, ExternalPerson, OutboundMessage } from '@project/db'

// Shapes returned by the API. Response schemas in openapi.yaml strip anything not listed,
// but serializers keep the intent explicit (e.g. passwordHash never leaves User).

export const userSummarySelect = { id: true, displayName: true, slug: true, avatarUrl: true, title: true } as const

export type UserSummaryRow = Pick<User, 'id' | 'displayName' | 'slug' | 'avatarUrl' | 'title'>

export function userSummary(u: UserSummaryRow | null | undefined) {
  if (!u) return null
  return { id: u.id, displayName: u.displayName, slug: u.slug, avatarUrl: u.avatarUrl, title: u.title }
}

export function contactOut(c: Contact) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    addressLine: c.addressLine,
    city: c.city,
    region: c.region,
    postalCode: c.postalCode,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export const opportunitySummaryInclude = {
  owner: { select: userSummarySelect },
  contact: { select: { name: true } },
} as const

export function opportunitySummary(o: Opportunity & { owner: UserSummaryRow | null; contact: { name: string } }) {
  return {
    id: o.id,
    contactId: o.contactId,
    contactName: o.contact.name,
    title: o.title,
    stageId: o.stageId,
    status: o.status,
    owner: userSummary(o.owner),
    leadSourceOptionId: o.leadSourceOptionId,
    estimatedValueCents: o.estimatedValueCents,
    contractValueCents: o.contractValueCents,
    nextFollowUpAt: o.nextFollowUpAt,
    lastActivityAt: o.lastActivityAt,
    stageEnteredAt: o.stageEnteredAt,
    leadReceivedAt: o.leadReceivedAt,
    createdAt: o.createdAt,
  }
}

export function transitionOut(t: StageTransition, actor: UserSummaryRow | null | undefined) {
  return {
    id: t.id,
    kind: t.kind,
    fromStageId: t.fromStageId,
    toStageId: t.toStageId,
    fromStatus: t.fromStatus,
    toStatus: t.toStatus,
    reason: t.reason,
    actor: userSummary(actor),
    occurredAt: t.occurredAt,
  }
}

export function externalPersonOut(p: ExternalPerson | null | undefined) {
  if (!p) return null
  return { id: p.id, displayName: p.displayName, companyName: p.companyName, phone: p.phone, email: p.email }
}

export function messageSummary(m: OutboundMessage, requestedBy: UserSummaryRow | null | undefined) {
  return {
    id: m.id,
    subject: m.subject,
    toEmail: m.toEmail,
    toName: m.toName,
    status: m.status,
    templateKey: m.templateKey,
    provider: m.provider,
    queuedAt: m.queuedAt,
    sentAt: m.sentAt,
    deliveredAt: m.deliveredAt,
    failedAt: m.failedAt,
    lastError: m.lastError,
    requestedBy: userSummary(requestedBy),
    opportunityId: m.opportunityId,
    reviewRequestId: m.reviewRequestId,
  }
}

export async function usersById(ids: (string | null | undefined)[]) {
  const { db } = await import('@project/db')
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  if (!unique.length) return new Map<string, UserSummaryRow>()
  const rows = await db.user.findMany({ where: { id: { in: unique } }, select: userSummarySelect })
  return new Map(rows.map((u) => [u.id, u]))
}
