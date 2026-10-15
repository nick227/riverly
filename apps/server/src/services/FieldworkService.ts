import { db, type AppointmentStatus, type ExternalLinkKind } from '@project/db'
import { appendActivity, transaction } from '../lib/activity'
import { assertActiveMember, assertExternalPerson, loadOpportunity } from '../lib/access'
import { requireOrg, type AuthContext } from '../lib/context'
import { notFound, unprocessable } from '../lib/errors'
import { externalPersonOut, userSummary, usersById } from '../lib/serialize'
import { currentWorkflow } from '../lib/workflow'
import { appointmentOut, externalLinkOut } from './OpportunityService'
import { assertHttpUrl } from './WorkflowService'

type AppointmentInput = {
  stageId?: string
  kind?: string
  startsAt?: string
  endsAt?: string | null
  status?: AppointmentStatus
  assigneeUserId?: string | null
  externalPersonId?: string | null
  notes?: string | null
  reason?: string | null
}

export class FieldworkService {
  async createAppointment(auth: AuthContext, opportunityId: string, input: AppointmentInput & { stageId: string; startsAt: string }) {
    const ctx = requireOrg(auth)
    const opp = await loadOpportunity(ctx, opportunityId)
    const { definition } = await currentWorkflow(ctx.orgId)
    if (!definition.stages.some((s) => s.id === input.stageId)) throw unprocessable('Unknown stage')
    const startsAt = new Date(input.startsAt)
    const endsAt = input.endsAt ? new Date(input.endsAt) : null
    if (endsAt && endsAt <= startsAt) throw unprocessable('End time must be after the start time')
    if (input.assigneeUserId) await assertActiveMember(ctx.orgId, input.assigneeUserId)
    if (input.externalPersonId) await assertExternalPerson(ctx.orgId, input.externalPersonId)
    const field = definition.fields.find((f) => f.type === 'appointment' && definition.stages.find((s) => s.id === input.stageId)?.fieldIds.includes(f.id))
    const kind = input.kind ?? field?.appointmentKind ?? 'appointment'
    const appt = await transaction(async (tx) => {
      const row = await tx.appointment.create({
        data: {
          organizationId: ctx.orgId,
          opportunityId,
          stageId: input.stageId,
          kind,
          startsAt,
          endsAt,
          assigneeUserId: input.assigneeUserId ?? null,
          externalPersonId: input.externalPersonId ?? null,
          notes: input.notes?.trim() || null,
          createdById: ctx.userId,
          createdAt: new Date(),
        },
        include: { externalPerson: true },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'appointment.scheduled',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SELF_REPORTED',
        contactId: opp.contactId,
        opportunityId,
        stageId: input.stageId,
        note: row.notes,
        payload: { appointmentId: row.id, kind, startsAt: startsAt.toISOString(), externalPersonId: row.externalPersonId, assigneeUserId: row.assigneeUserId },
      })
      return row
    })
    return appointmentOut(appt, await usersById([appt.assigneeUserId]))
  }

  async updateAppointment(auth: AuthContext, id: string, input: AppointmentInput) {
    const ctx = requireOrg(auth)
    const before = await db.appointment.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!before) throw notFound('Appointment')
    const opp = await loadOpportunity(ctx, before.opportunityId)
    if (input.assigneeUserId) await assertActiveMember(ctx.orgId, input.assigneeUserId)
    if (input.externalPersonId) await assertExternalPerson(ctx.orgId, input.externalPersonId)
    const startsAt = input.startsAt ? new Date(input.startsAt) : undefined
    const endsAt = input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null
    if ((endsAt ?? before.endsAt) && (endsAt ?? before.endsAt)! <= (startsAt ?? before.startsAt))
      throw unprocessable('End time must be after the start time')

    const rescheduled = startsAt && startsAt.getTime() !== before.startsAt.getTime()
    const statusChanged = input.status && input.status !== before.status
    const type = statusChanged
      ? `appointment.${input.status!.toLowerCase()}`
      : rescheduled
        ? 'appointment.rescheduled'
        : 'appointment.updated'

    const appt = await transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { id },
        data: {
          startsAt,
          endsAt,
          status: input.status,
          assigneeUserId: input.assigneeUserId,
          externalPersonId: input.externalPersonId,
          notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
        },
        include: { externalPerson: true },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type,
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SELF_REPORTED',
        contactId: opp.contactId,
        opportunityId: opp.id,
        stageId: before.stageId,
        note: input.reason?.trim() || null,
        payload: {
          appointmentId: id,
          kind: before.kind,
          fromStartsAt: before.startsAt.toISOString(),
          startsAt: row.startsAt.toISOString(),
          fromStatus: before.status,
          status: row.status,
        },
      })
      return row
    })
    return appointmentOut(appt, await usersById([appt.assigneeUserId]))
  }

  async addParticipant(
    auth: AuthContext,
    opportunityId: string,
    input: { roleKey: string; stageId?: string | null; memberUserId?: string | null; externalPersonId?: string | null },
  ) {
    const ctx = requireOrg(auth)
    const opp = await loadOpportunity(ctx, opportunityId)
    if (!!input.memberUserId === !!input.externalPersonId) throw unprocessable('Choose either a team member or an external person')
    if (input.memberUserId) await assertActiveMember(ctx.orgId, input.memberUserId)
    const person = input.externalPersonId ? await assertExternalPerson(ctx.orgId, input.externalPersonId) : null
    const roleKey = input.roleKey.trim().toLowerCase()
    const row = await transaction(async (tx) => {
      const p = await tx.opportunityParticipant.create({
        data: {
          organizationId: ctx.orgId,
          opportunityId,
          roleKey,
          stageId: input.stageId ?? null,
          memberUserId: input.memberUserId ?? null,
          externalPersonId: input.externalPersonId ?? null,
        },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'participant.added',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        contactId: opp.contactId,
        opportunityId,
        stageId: input.stageId ?? opp.stageId,
        payload: { participantId: p.id, roleKey, memberUserId: p.memberUserId, externalPersonId: p.externalPersonId, name: person?.displayName ?? null },
      })
      return p
    })
    const people = await usersById([row.memberUserId])
    return {
      id: row.id,
      roleKey: row.roleKey,
      stageId: row.stageId,
      member: userSummary(row.memberUserId ? people.get(row.memberUserId) : null),
      externalPerson: externalPersonOut(person),
    }
  }

  async removeParticipant(auth: AuthContext, id: string) {
    const ctx = requireOrg(auth)
    const p = await db.opportunityParticipant.findFirst({ where: { id, organizationId: ctx.orgId, removedAt: null } })
    if (!p) throw notFound('Participant')
    const opp = await loadOpportunity(ctx, p.opportunityId)
    await transaction(async (tx) => {
      await tx.opportunityParticipant.update({ where: { id }, data: { removedAt: new Date() } })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'participant.removed',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        contactId: opp.contactId,
        opportunityId: opp.id,
        stageId: p.stageId ?? opp.stageId,
        payload: { participantId: id, roleKey: p.roleKey, memberUserId: p.memberUserId, externalPersonId: p.externalPersonId },
      })
    })
  }

  async listExternalPeople(auth: AuthContext, q?: string) {
    const ctx = requireOrg(auth)
    const rows = await db.externalPerson.findMany({
      where: { organizationId: ctx.orgId, ...(q ? { OR: [{ displayName: { contains: q } }, { companyName: { contains: q } }] } : {}) },
      orderBy: { displayName: 'asc' },
      take: 50,
    })
    return rows.map((p) => externalPersonOut(p)!)
  }

  async createExternalPerson(auth: AuthContext, input: { displayName: string; companyName?: string | null; phone?: string | null; email?: string | null }) {
    const ctx = requireOrg(auth)
    const row = await db.externalPerson.create({
      data: {
        organizationId: ctx.orgId,
        displayName: input.displayName.trim(),
        companyName: input.companyName?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
      },
    })
    return externalPersonOut(row)!
  }

  /** Manual finance reference. Always MANUAL provenance — never treated as verified money. */
  async createExternalLink(auth: AuthContext, opportunityId: string, input: LinkInput & { kind: ExternalLinkKind; label: string }) {
    const ctx = requireOrg(auth)
    const opp = await loadOpportunity(ctx, opportunityId)
    const row = await transaction(async (tx) => {
      const link = await tx.externalRecordLink.create({
        data: {
          organizationId: ctx.orgId,
          opportunityId,
          kind: input.kind,
          label: input.label.trim(),
          url: input.url ? assertHttpUrl(input.url) : null,
          amountCents: input.amountCents ?? null,
          statusLabel: input.statusLabel?.trim() || null,
          statusRecordedAt: input.statusLabel ? new Date() : null,
          provenance: 'MANUAL',
          recordedById: ctx.userId,
        },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'finance.reference_added',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SELF_REPORTED',
        contactId: opp.contactId,
        opportunityId,
        stageId: opp.stageId,
        payload: { linkId: link.id, kind: link.kind, label: link.label, amountCents: link.amountCents, statusLabel: link.statusLabel, provenance: 'MANUAL' },
      })
      return link
    })
    return externalLinkOut(row)
  }

  async updateExternalLink(auth: AuthContext, id: string, input: LinkInput) {
    const ctx = requireOrg(auth)
    const before = await db.externalRecordLink.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!before) throw notFound('Reference')
    const opp = await loadOpportunity(ctx, before.opportunityId)
    const statusChanged = input.statusLabel !== undefined && (input.statusLabel?.trim() || null) !== before.statusLabel
    const row = await transaction(async (tx) => {
      const link = await tx.externalRecordLink.update({
        where: { id },
        data: {
          kind: input.kind,
          label: input.label?.trim(),
          url: input.url === undefined ? undefined : input.url ? assertHttpUrl(input.url) : null,
          amountCents: input.amountCents,
          statusLabel: input.statusLabel === undefined ? undefined : input.statusLabel?.trim() || null,
          statusRecordedAt: statusChanged ? new Date() : undefined,
          recordedById: ctx.userId,
        },
      })
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'finance.reference_updated',
        category: 'WORK',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SELF_REPORTED',
        contactId: opp.contactId,
        opportunityId: opp.id,
        stageId: opp.stageId,
        payload: {
          linkId: id,
          label: link.label,
          fromStatus: before.statusLabel,
          statusLabel: link.statusLabel,
          fromAmountCents: before.amountCents,
          amountCents: link.amountCents,
          provenance: 'MANUAL',
        },
      })
      return link
    })
    return externalLinkOut(row)
  }
}

type LinkInput = { kind?: ExternalLinkKind; label?: string; url?: string | null; amountCents?: number | null; statusLabel?: string | null }
