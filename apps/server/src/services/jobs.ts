import type { Prisma, TimestampProvenance } from '@project/db'
import type { WorkflowDefinition } from '@project/shared'
import { appendActivity } from '../lib/activity'
import { unprocessable } from '../lib/errors'
import { firstStageId } from '../lib/workflow'

type Tx = Prisma.TransactionClient

export type NewJobFields = {
  title: string
  propertyAddress?: string | null
  inquiry?: string | null
  leadSourceOptionId?: string | null
  urgencyOptionId?: string | null
  ownerId?: string | null
  leadReceivedAt?: string | null
}

/** Option IDs must exist on the field and not be retired (unless unchanged). */
export function assertOption(def: WorkflowDefinition, fieldId: string, optionId: string | null | undefined, previous?: string | null) {
  if (!optionId || optionId === previous) return
  const field = def.fields.find((f) => f.id === fieldId)
  const option = field?.options?.find((o) => o.id === optionId)
  if (!option) throw unprocessable(`"${optionId}" is not an option of ${field?.label ?? fieldId}`)
  if (option.retired) throw unprocessable(`"${option.label}" has been retired`)
}

/** Field ID bound to a native column, so option validation follows company config. */
export function fieldIdForBinding(def: WorkflowDefinition, binding: string) {
  return def.fields.find((f) => f.binding === binding)?.id ?? binding
}

export async function assertMemberTx(tx: Tx, organizationId: string, userId: string) {
  const m = await tx.membership.findUnique({ where: { organizationId_userId: { organizationId, userId } } })
  if (!m || m.status !== 'ACTIVE') throw unprocessable('That person is not an active member of this company')
}

/**
 * Creates an independent job for a contact in the first active stage, with an initial
 * transition (so stage-reach reports include it) and a `lead.received` activity event.
 */
export async function createJobTx(
  tx: Tx,
  args: {
    organizationId: string
    workflow: { versionId: string; definition: WorkflowDefinition }
    contactId: string
    fields: NewJobFields
    actor: { type: 'USER'; userId: string } | { type: 'SYSTEM' | 'INTEGRATION'; label: string }
    source: { name: string; kind: string; sourceRecordId?: string | null }
    leadReceivedAt?: Date
    leadReceivedVia?: TimestampProvenance
  },
) {
  const { definition } = args.workflow
  const f = args.fields
  assertOption(definition, fieldIdForBinding(definition, 'opportunity.leadSourceOptionId'), f.leadSourceOptionId)
  assertOption(definition, fieldIdForBinding(definition, 'opportunity.urgencyOptionId'), f.urgencyOptionId)
  if (f.ownerId) await assertMemberTx(tx, args.organizationId, f.ownerId)

  const stageId = firstStageId(definition)
  const manualTime = f.leadReceivedAt ? new Date(f.leadReceivedAt) : null
  if (manualTime && manualTime.getTime() > Date.now() + 60_000) throw unprocessable('Lead received time cannot be in the future')
  const leadReceivedAt = manualTime ?? args.leadReceivedAt ?? new Date()
  const leadReceivedVia = manualTime ? 'MANUAL' : (args.leadReceivedVia ?? 'SYSTEM')
  const actorUserId = args.actor.type === 'USER' ? args.actor.userId : null

  const job = await tx.opportunity.create({
    data: {
      organizationId: args.organizationId,
      contactId: args.contactId,
      workflowVersionId: args.workflow.versionId,
      stageId,
      title: f.title.trim(),
      propertyAddress: f.propertyAddress?.trim() || null,
      inquiry: f.inquiry?.trim() || null,
      leadSourceOptionId: f.leadSourceOptionId ?? null,
      urgencyOptionId: f.urgencyOptionId ?? null,
      ownerId: f.ownerId ?? null,
      leadReceivedAt,
      leadReceivedVia,
      sourceRecordId: args.source.sourceRecordId ?? null,
      createdById: actorUserId,
      createdAt: new Date(),
      stageEnteredAt: new Date(),
      lastActivityAt: new Date(),
    },
  })
  await tx.stageTransition.create({
    data: {
      organizationId: args.organizationId,
      opportunityId: job.id,
      workflowVersionId: args.workflow.versionId,
      kind: 'FORWARD',
      fromStageId: null,
      toStageId: stageId,
      reason: 'Job created',
      actorId: actorUserId,
      occurredAt: new Date(),
    },
  })
  await appendActivity(tx, {
    organizationId: args.organizationId,
    type: 'lead.received',
    category: 'WORK',
    actorType: args.actor.type,
    actorId: actorUserId,
    actorLabel: args.actor.type === 'USER' ? null : args.actor.label,
    verification: 'SYSTEM_RECORDED',
    contactId: args.contactId,
    opportunityId: job.id,
    stageId,
    workflowVersionId: args.workflow.versionId,
    occurredAt: leadReceivedAt,
    payload: {
      sourceName: args.source.name,
      sourceKind: args.source.kind,
      leadReceivedVia,
      ownerId: job.ownerId,
      title: job.title,
    },
  })
  return job
}
