import { db, type Prisma } from '@project/db'
import { normalizeEmail, normalizePhone } from '@project/shared'
import { appendActivity, transaction } from '../lib/activity'
import { loadContact } from '../lib/access'
import { requireOrg, type AuthContext } from '../lib/context'
import { randomToken } from '../lib/crypto'
import { unprocessable } from '../lib/errors'
import { decodeCursor, encodeCursor, normalizeLimit } from '../lib/pagination'
import { contactOut, messageSummary, opportunitySummary, opportunitySummaryInclude, userSummarySelect } from '../lib/serialize'
import { currentWorkflow } from '../lib/workflow'
import { createJobTx, type NewJobFields } from './jobs'
import { ensureSource } from './sources'

type ContactFields = {
  name?: string
  email?: string | null
  phone?: string | null
  addressLine?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  notes?: string | null
}

export class ContactService {
  async list(auth: AuthContext, q: { cursor?: string; limit?: number; q?: string; sourceId?: string }) {
    const ctx = requireOrg(auth)
    const limit = normalizeLimit(q.limit, 100, 25)
    const cursor = decodeCursor(q.cursor)
    const where: Prisma.ContactWhereInput = {
      organizationId: ctx.orgId,
      deletedAt: null,
      ...(q.q ? { OR: searchConditions(q.q) } : {}),
      ...(q.sourceId ? { sourceLinks: { some: { sourceRecord: { sourceId: q.sourceId } } } } : {}),
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                ],
              },
            ],
          }
        : {}),
    }
    const rows = await db.contact.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        opportunities: { where: { deletedAt: null }, include: opportunitySummaryInclude, orderBy: { createdAt: 'desc' } },
        sourceLinks: { include: { sourceRecord: { include: { source: true } } } },
      },
    })
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const last = items[items.length - 1]
    return {
      data: items.map((c) => ({
        ...contactOut(c),
        opportunities: c.opportunities.map(opportunitySummary),
        sourceNames: [...new Set(c.sourceLinks.map((l) => l.sourceRecord.source.displayName))],
      })),
      meta: {
        hasMore,
        nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
      },
    }
  }

  async get(auth: AuthContext, id: string) {
    const ctx = requireOrg(auth)
    await loadContact(ctx, id)
    return this.detail(ctx.orgId, id)
  }

  async detail(orgId: string, id: string) {
    const c = await db.contact.findFirstOrThrow({
      where: { id, organizationId: orgId },
      include: {
        opportunities: { where: { deletedAt: null }, include: opportunitySummaryInclude, orderBy: { createdAt: 'desc' } },
        sourceLinks: { include: { sourceRecord: { include: { source: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    const messages = await db.outboundMessage.findMany({
      where: { organizationId: orgId, contactId: id },
      orderBy: { queuedAt: 'desc' },
      take: 5,
    })
    const requesters = await db.user.findMany({
      where: { id: { in: messages.map((m) => m.requestedById) } },
      select: userSummarySelect,
    })
    const byId = new Map(requesters.map((u) => [u.id, u]))
    return {
      ...contactOut(c),
      opportunities: c.opportunities.map(opportunitySummary),
      sources: c.sourceLinks.map((l) => ({
        sourceRecordId: l.sourceRecordId,
        sourceName: l.sourceRecord.source.displayName,
        kind: l.sourceRecord.source.kind,
        receivedAt: l.sourceRecord.receivedAt,
        providerTimestamp: l.sourceRecord.providerTimestamp,
        matchedBy: l.matchedBy,
      })),
      recentEmails: messages.map((m) => messageSummary(m, byId.get(m.requestedById))),
    }
  }

  /**
   * Manual intake. Always records a MANUAL source record so provenance is uniform across
   * channels. Duplicate checking happens before this call (matchContacts) — the user chose
   * to create a new person.
   */
  async create(auth: AuthContext, input: ContactFields & { name: string; job?: NewJobFields }) {
    const ctx = requireOrg(auth)
    const fields = cleanContact(input)
    if (!fields.name) throw unprocessable('Name is required')
    const workflow = input.job ? await currentWorkflow(ctx.orgId) : null
    const contactId = await transaction(async (tx) => {
      const source = await ensureSource(tx, ctx.orgId, 'MANUAL', 'Manual entry')
      const record = await tx.sourceRecord.create({
        data: {
          organizationId: ctx.orgId,
          sourceId: source.id,
          externalId: `manual_${randomToken(12)}`,
          rawPayload: input as unknown as Prisma.InputJsonValue,
          contentHash: 'manual',
          receivedAt: new Date(),
          dedupeStatus: 'NEW_CONTACT',
          reviewedById: ctx.userId,
          reviewedAt: new Date(),
        },
      })
      const contact = await tx.contact.create({
        data: { organizationId: ctx.orgId, ...fields, name: fields.name!, createdById: ctx.userId, createdAt: new Date() },
      })
      await tx.sourceRecord.update({ where: { id: record.id }, data: { canonicalContactId: contact.id } })
      await tx.contactSourceLink.create({
        data: { organizationId: ctx.orgId, contactId: contact.id, sourceRecordId: record.id, matchedBy: 'created', confirmedById: ctx.userId },
      })
      if (input.job && workflow) {
        await createJobTx(tx, {
          organizationId: ctx.orgId,
          workflow: { versionId: workflow.version.id, definition: workflow.definition },
          contactId: contact.id,
          fields: input.job,
          actor: { type: 'USER', userId: ctx.userId },
          source: { name: source.displayName, kind: source.kind, sourceRecordId: record.id },
        })
      } else {
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: 'contact.created',
          category: 'WORK',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: contact.id,
          payload: { sourceName: source.displayName },
        })
      }
      return contact.id
    })
    return this.detail(ctx.orgId, contactId)
  }

  async update(auth: AuthContext, id: string, input: ContactFields) {
    const ctx = requireOrg(auth)
    const before = await loadContact(ctx, id)
    const fields = cleanContact(input)
    if (input.name !== undefined && !fields.name) throw unprocessable('Name cannot be empty')
    const changed = (Object.keys(fields) as (keyof typeof fields)[]).filter(
      (k) => !k.endsWith('Normalized') && (fields[k] ?? null) !== (before[k as keyof typeof before] ?? null),
    )
    if (!changed.length) return contactOut(before)
    const contact = await transaction(async (tx) => {
      const row = await tx.contact.update({ where: { id }, data: fields })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'contact.updated',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        contactId: id,
        payload: {
          changes: changed.map((k) => ({ field: k, from: before[k as keyof typeof before] ?? null, to: fields[k] ?? null })),
        },
      })
      return row
    })
    return contactOut(contact)
  }

  async match(auth: AuthContext, input: { email?: string | null; phone?: string | null; name?: string | null }) {
    const ctx = requireOrg(auth)
    return findMatches(ctx.orgId, input)
  }

  async createOpportunity(auth: AuthContext, contactId: string, input: NewJobFields) {
    const ctx = requireOrg(auth)
    await loadContact(ctx, contactId)
    const workflow = await currentWorkflow(ctx.orgId)
    const job = await transaction(async (tx) => {
      const source = await ensureSource(tx, ctx.orgId, 'MANUAL', 'Manual entry')
      return createJobTx(tx, {
        organizationId: ctx.orgId,
        workflow: { versionId: workflow.version.id, definition: workflow.definition },
        contactId,
        fields: input,
        actor: { type: 'USER', userId: ctx.userId },
        source: { name: source.displayName, kind: source.kind },
      })
    })
    return opportunitySummary(await db.opportunity.findUniqueOrThrow({ where: { id: job.id }, include: opportunitySummaryInclude }))
  }
}

export function cleanContact(input: ContactFields) {
  const trim = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null)
  const out: ContactFields & { emailNormalized?: string | null; phoneNormalized?: string | null } = {
    name: input.name === undefined ? undefined : input.name.trim(),
    email: trim(input.email),
    phone: trim(input.phone),
    addressLine: trim(input.addressLine),
    city: trim(input.city),
    region: trim(input.region),
    postalCode: trim(input.postalCode),
    notes: trim(input.notes),
  }
  if (out.email !== undefined) {
    if (out.email && !normalizeEmail(out.email)) throw unprocessable('Email address looks invalid')
    out.emailNormalized = normalizeEmail(out.email)
  }
  if (out.phone !== undefined) out.phoneNormalized = normalizePhone(out.phone)
  for (const k of Object.keys(out) as (keyof typeof out)[]) if (out[k] === undefined) delete out[k]
  return out
}

function searchConditions(q: string): Prisma.ContactWhereInput[] {
  const digits = q.replace(/\D/g, '')
  return [
    { name: { contains: q } },
    { email: { contains: q } },
    ...(digits.length >= 3 ? [{ phoneNormalized: { contains: digits } }] : []),
  ]
}

/** Possible existing contacts by normalized email/phone (strong) and exact name (weak). Never merges. */
export async function findMatches(orgId: string, input: { email?: string | null; phone?: string | null; name?: string | null }) {
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone)
  const name = input.name?.trim()
  const or: Prisma.ContactWhereInput[] = []
  if (email) or.push({ emailNormalized: email })
  if (phone) or.push({ phoneNormalized: phone })
  if (name && name.length >= 3) or.push({ name })
  if (!or.length) return []
  const rows = await db.contact.findMany({ where: { organizationId: orgId, deletedAt: null, OR: or }, take: 10 })
  return rows.map((c) => {
    const matchedOn: ('email' | 'phone' | 'name')[] = []
    if (email && c.emailNormalized === email) matchedOn.push('email')
    if (phone && c.phoneNormalized === phone) matchedOn.push('phone')
    if (name && c.name.toLowerCase() === name.toLowerCase()) matchedOn.push('name')
    return { contact: contactOut(c), matchedOn }
  })
}
