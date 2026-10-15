import { db, type OutboundMessage, type Prisma } from '@project/db'
import { firstName, renderTemplate, templateTokens, KNOWN_TOKENS } from '@project/shared'
import { appendActivity, transaction } from '../lib/activity'
import { loadContact, loadOpportunity } from '../lib/access'
import { requireOrg, requirePermission, type AuthContext } from '../lib/context'
import { conflict, notFound, unprocessable } from '../lib/errors'
import { isUniqueViolation } from '../lib/idempotency'
import { messageSummary, usersById } from '../lib/serialize'
import { notifyWorker } from '../email/worker'

const UNRESOLVED = /\{\{\s*[a-zA-Z]+\.[a-zA-Z]+\s*\}\}/

export class EmailService {
  async listTemplates(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const rows = await db.emailTemplate.findMany({ where: { organizationId: ctx.orgId }, orderBy: { createdAt: 'asc' } })
    return rows.map(templateOut)
  }

  async updateTemplate(
    auth: AuthContext,
    id: string,
    input: { label?: string; stageId?: string | null; subjectTemplate?: string; bodyTemplate?: string; isEnabled?: boolean },
  ) {
    const ctx = requirePermission(auth, 'settings.manage')
    const t = await db.emailTemplate.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!t) throw notFound('Template')
    const unknown = [...templateTokens(input.subjectTemplate ?? ''), ...templateTokens(input.bodyTemplate ?? '')].filter(
      (k) => !(KNOWN_TOKENS as readonly string[]).includes(k),
    )
    if (unknown.length) throw unprocessable(`Unknown placeholder(s): ${unknown.map((k) => `{{${k}}}`).join(', ')}`, { allowed: KNOWN_TOKENS })
    const contentChanged =
      (input.subjectTemplate !== undefined && input.subjectTemplate !== t.subjectTemplate) ||
      (input.bodyTemplate !== undefined && input.bodyTemplate !== t.bodyTemplate)
    const row = await db.emailTemplate.update({
      where: { id },
      data: { ...input, version: contentChanged ? { increment: 1 } : undefined, updatedById: ctx.userId },
    })
    return templateOut(row)
  }

  /** Fills a template from real records. Missing values are listed, never invented. */
  async render(auth: AuthContext, input: { templateId: string; contactId: string; opportunityId?: string | null }) {
    const ctx = requireOrg(auth)
    const template = await db.emailTemplate.findFirst({ where: { id: input.templateId, organizationId: ctx.orgId } })
    if (!template) throw notFound('Template')
    const contact = await loadContact(ctx, input.contactId)
    const opp = input.opportunityId ? await loadOpportunity(ctx, input.opportunityId) : null
    if (opp && opp.contactId !== contact.id) throw unprocessable('That job belongs to a different contact')
    const [org, me, sender] = await Promise.all([
      db.organization.findUniqueOrThrow({ where: { id: ctx.orgId } }),
      db.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
      defaultSender(ctx.orgId),
    ])
    const [owner, appointment, paymentLink] = opp
      ? await Promise.all([
          opp.ownerId ? db.user.findUnique({ where: { id: opp.ownerId } }) : null,
          db.appointment.findFirst({
            where: { opportunityId: opp.id, status: 'SCHEDULED' },
            orderBy: { startsAt: 'asc' },
          }),
          db.externalRecordLink.findFirst({
            where: { opportunityId: opp.id, kind: { in: ['PAYMENT', 'INVOICE'] }, url: { not: null } },
            orderBy: { createdAt: 'desc' },
          }),
        ])
      : [null, null, null]
    const tz = org.timezone
    const values: Record<string, string | null> = {
      'contact.firstName': firstName(contact.name),
      'contact.name': contact.name,
      'company.name': org.name,
      'sender.name': me.displayName,
      'owner.name': owner?.displayName ?? null,
      'job.title': opp?.title.toLowerCase() ?? null,
      'job.propertyAddress': opp?.propertyAddress ?? null,
      'job.estimate': opp?.estimatedValueCents != null ? money(opp.estimatedValueCents) : null,
      'appointment.date': appointment ? appointment.startsAt.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }) : null,
      'appointment.time': appointment ? appointment.startsAt.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }) : null,
      'payment.url': paymentLink?.url ?? null,
      'review.url': org.reviewUrl ?? null,
    }
    const subject = renderTemplate(template.subjectTemplate, values)
    const body = renderTemplate(template.bodyTemplate, values)
    const unresolved = [...new Set([...subject.unresolved, ...body.unresolved])]
    const blockers: string[] = []
    if (!contact.email) blockers.push(`${contact.name} has no email address`)
    if (!sender) blockers.push('No email sender is set up for this company')
    else if (sender.verification !== 'VERIFIED') blockers.push(`Sender ${sender.fromEmail} is not verified`)
    if (template.stableKey === 'review_request' && !org.reviewUrl) blockers.push('Set a review link in Settings before requesting reviews')
    const prior = await db.outboundMessage.findMany({
      where: { organizationId: ctx.orgId, ...(opp ? { opportunityId: opp.id } : { contactId: contact.id }) },
      orderBy: { queuedAt: 'desc' },
      take: 10,
    })
    const priorMap = await messageSummariesFor(prior)
    return {
      templateId: template.id,
      templateKey: template.stableKey,
      templateVersion: template.version,
      sender: sender
        ? { id: sender.id, fromName: sender.fromName, fromEmail: sender.fromEmail, provider: sender.provider, verified: sender.verification === 'VERIFIED' }
        : null,
      to: { name: contact.name, email: contact.email },
      subject: subject.text,
      body: body.text,
      unresolved,
      blockers,
      priorSends: prior.map((m) => priorMap.get(m.id)!),
    }
  }

  /**
   * Freezes the reviewed message and queues it (the outbox row). One idempotency key → one
   * message, however many times the button is pressed. Delivery is reported asynchronously.
   */
  async send(
    auth: AuthContext,
    input: { templateId?: string | null; contactId: string; opportunityId?: string | null; stageId?: string | null; subject: string; body: string; idempotencyKey: string },
  ) {
    const ctx = requireOrg(auth)
    const existing = await db.outboundMessage.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: ctx.orgId, idempotencyKey: input.idempotencyKey } },
    })
    if (existing) return (await messageSummariesFor([existing])).get(existing.id)!
    const contact = await loadContact(ctx, input.contactId)
    const opp = input.opportunityId ? await loadOpportunity(ctx, input.opportunityId) : null
    if (opp && opp.contactId !== contact.id) throw unprocessable('That job belongs to a different contact')
    if (!contact.email) throw unprocessable(`${contact.name} has no email address`)
    const subject = input.subject.trim()
    const body = input.body.trim()
    if (UNRESOLVED.test(subject) || UNRESOLVED.test(body)) throw unprocessable('Fill in or remove the highlighted placeholders before sending')
    const sender = await defaultSender(ctx.orgId)
    if (!sender) throw unprocessable('No email sender is set up for this company')
    if (sender.verification !== 'VERIFIED') throw unprocessable(`Sender ${sender.fromEmail} is not verified`)
    const template = input.templateId ? await db.emailTemplate.findFirst({ where: { id: input.templateId, organizationId: ctx.orgId } }) : null
    if (input.templateId && !template) throw notFound('Template')
    const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.orgId } })
    const isReview = template?.stableKey === 'review_request'
    if (isReview && !opp) throw unprocessable('Review requests are sent from a job')
    if (isReview && !org.reviewUrl) throw unprocessable('Set a review link in Settings before requesting reviews')

    try {
      const message = await transaction(async (tx) => {
        let reviewRequestId: string | null = null
        if (isReview && opp) {
          // Repeated requests for one job share a ReviewRequest; each send is its own message.
          const rr =
            (await tx.reviewRequest.findFirst({ where: { opportunityId: opp.id, organizationId: ctx.orgId } })) ??
            (await tx.reviewRequest.create({
              data: { organizationId: ctx.orgId, opportunityId: opp.id, contactId: contact.id, destinationUrl: org.reviewUrl!, createdById: ctx.userId },
            }))
          reviewRequestId = rr.id
        }
        const m = await tx.outboundMessage.create({
          data: {
            organizationId: ctx.orgId,
            contactId: contact.id,
            opportunityId: opp?.id ?? null,
            stageId: input.stageId ?? opp?.stageId ?? null,
            templateId: template?.id ?? null,
            templateKey: template?.stableKey ?? null,
            templateVersion: template?.version ?? null,
            senderIdentityId: sender.id,
            provider: sender.provider,
            fromSnapshot: `${sender.fromName} <${sender.fromEmail}>`,
            replyToSnapshot: sender.replyTo,
            toEmail: contact.email!,
            toName: contact.name,
            subject,
            bodyText: body,
            idempotencyKey: input.idempotencyKey,
            requestedById: ctx.userId,
            reviewRequestId,
            queuedAt: new Date(),
            nextAttemptAt: new Date(),
          },
        })
        await appendActivity(tx, {
          organizationId: ctx.orgId,
          type: isReview ? 'review.requested' : 'email.message',
          category: 'MESSAGE',
          actorType: 'USER',
          actorId: ctx.userId,
          verification: 'SYSTEM_RECORDED',
          contactId: contact.id,
          opportunityId: opp?.id ?? null,
          stageId: m.stageId,
          outboundMessageId: m.id,
          payload: { templateKey: m.templateKey, subject },
        })
        return m
      })
      notifyWorker()
      return (await messageSummariesFor([message])).get(message.id)!
    } catch (err) {
      if (isUniqueViolation(err, 'idempotencyKey')) {
        const again = await db.outboundMessage.findUnique({
          where: { organizationId_idempotencyKey: { organizationId: ctx.orgId, idempotencyKey: input.idempotencyKey } },
        })
        if (again) return (await messageSummariesFor([again])).get(again.id)!
      }
      throw err
    }
  }

  async list(auth: AuthContext, q: { opportunityId?: string; contactId?: string; limit?: number }) {
    const ctx = requireOrg(auth)
    const rows = await db.outboundMessage.findMany({
      where: {
        organizationId: ctx.orgId,
        ...(q.opportunityId ? { opportunityId: q.opportunityId } : {}),
        ...(q.contactId ? { contactId: q.contactId } : {}),
      },
      orderBy: { queuedAt: 'desc' },
      take: Math.min(q.limit ?? 25, 100),
    })
    const map = await messageSummariesFor(rows)
    return rows.map((m) => map.get(m.id)!)
  }

  async get(auth: AuthContext, id: string) {
    const ctx = requireOrg(auth)
    const m = await db.outboundMessage.findFirst({
      where: { id, organizationId: ctx.orgId },
      include: { deliveryAttempts: { orderBy: { attemptNumber: 'asc' } } },
    })
    if (!m) throw notFound('Message')
    const summary = (await messageSummariesFor([m])).get(m.id)!
    return {
      ...summary,
      fromSnapshot: m.fromSnapshot,
      bodyText: m.bodyText,
      attempts: m.deliveryAttempts.map((a) => ({ attemptNumber: a.attemptNumber, outcome: a.outcome, errorSummary: a.errorSummary, attemptedAt: a.attemptedAt })),
    }
  }

  /** Explicit retry of a failed message — same frozen content, no new message. */
  async retry(auth: AuthContext, id: string) {
    const ctx = requireOrg(auth)
    const m = await db.outboundMessage.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!m) throw notFound('Message')
    if (m.status !== 'FAILED') throw conflict('Only failed messages can be retried', 'not_failed')
    const updated = await db.outboundMessage.update({
      where: { id },
      data: { status: 'QUEUED', nextAttemptAt: new Date(), failedAt: null, lastError: null, attempts: 0, lockedUntil: null },
    })
    notifyWorker()
    return (await messageSummariesFor([updated])).get(id)!
  }
}

export async function defaultSender(organizationId: string) {
  return db.senderIdentity.findFirst({
    where: { organizationId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
}

export async function messageSummariesFor(messages: OutboundMessage[]) {
  const people = await usersById(messages.map((m) => m.requestedById))
  return new Map(messages.map((m) => [m.id, messageSummary(m, people.get(m.requestedById))]))
}

function templateOut(t: {
  id: string
  stableKey: string
  label: string
  stageId: string | null
  subjectTemplate: string
  bodyTemplate: string
  isEnabled: boolean
  version: number
  updatedAt: Date
}) {
  return {
    id: t.id,
    stableKey: t.stableKey,
    label: t.label,
    stageId: t.stageId,
    subjectTemplate: t.subjectTemplate,
    bodyTemplate: t.bodyTemplate,
    isEnabled: t.isEnabled,
    version: t.version,
    updatedAt: t.updatedAt,
  }
}

const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)

export type { Prisma }
