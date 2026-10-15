import type { ActivityCategory, ActorType, Prisma, Verification } from '@project/db'
import { db } from '@project/db'

type Tx = Prisma.TransactionClient

export type AppendActivity = {
  organizationId: string
  type: string
  category: ActivityCategory
  actorType: ActorType
  actorId?: string | null
  actorLabel?: string | null
  verification: Verification
  contactId?: string | null
  opportunityId?: string | null
  stageId?: string | null
  workflowVersionId?: string | null
  methodId?: string | null
  outcomeId?: string | null
  note?: string | null
  payload?: Prisma.InputJsonValue
  postId?: string | null
  recognitionId?: string | null
  outboundMessageId?: string | null
  importRunId?: string | null
  revisionOfId?: string | null
  correlationId?: string | null
  idempotencyKey?: string | null
  occurredAt?: Date
}

/**
 * The single write path for the Activity river. Every producer (users, intake, the email
 * worker) appends through here inside the same transaction as its domain mutation, so a
 * business change and its event commit together. Events are never updated afterwards.
 */
export async function appendActivity(tx: Tx, e: AppendActivity) {
  if (e.actorType === 'USER' && !e.actorId) throw new Error('USER activity requires actorId')
  const event = await tx.activityEvent.create({
    data: {
      organizationId: e.organizationId,
      type: e.type,
      category: e.category,
      actorType: e.actorType,
      actorId: e.actorId ?? null,
      actorLabel: e.actorLabel ?? null,
      verification: e.verification,
      contactId: e.contactId ?? null,
      opportunityId: e.opportunityId ?? null,
      stageId: e.stageId ?? null,
      workflowVersionId: e.workflowVersionId ?? null,
      methodId: e.methodId ?? null,
      outcomeId: e.outcomeId ?? null,
      note: e.note ?? null,
      payload: e.payload,
      postId: e.postId ?? null,
      recognitionId: e.recognitionId ?? null,
      outboundMessageId: e.outboundMessageId ?? null,
      importRunId: e.importRunId ?? null,
      revisionOfId: e.revisionOfId ?? null,
      correlationId: e.correlationId ?? null,
      idempotencyKey: e.idempotencyKey ?? null,
      occurredAt: e.occurredAt ?? new Date(),
      recordedAt: new Date(),
    },
  })
  if (e.opportunityId) {
    await tx.opportunity.updateMany({
      where: { id: e.opportunityId, organizationId: e.organizationId },
      data: { lastActivityAt: new Date() },
    })
  }
  return event
}

export const transaction = <T>(fn: (tx: Tx) => Promise<T>) => db.$transaction(fn, { timeout: 15_000 })
