import { db, type Prisma } from '@project/db'
import { activeStages, validateDefinition, workflowDefinitionSchema } from '@project/shared'
import { appendActivity, transaction } from '../lib/activity'
import { requireOrg, requirePermission, type AuthContext } from '../lib/context'
import { conflict, notFound, unprocessable } from '../lib/errors'
import { currentWorkflow } from '../lib/workflow'

type PublishInput = {
  baseVersionId: string
  definition: unknown
  stageMappings?: { fromStageId: string; toStageId: string }[]
  changeNote?: string
}

export class WorkflowService {
  async get(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const { version, definition } = await currentWorkflow(ctx.orgId)
    return this.out(ctx.orgId, version, definition)
  }

  /**
   * Publishes an immutable new version. Stable IDs can never be removed or repurposed;
   * stages are retired instead. Retiring a stage that still holds open jobs requires an
   * explicit mapping, and each mapped job gets its own audited transition.
   */
  async publish(auth: AuthContext, input: PublishInput) {
    const ctx = requirePermission(auth, 'settings.manage')
    const parsed = workflowDefinitionSchema.safeParse(input.definition)
    if (!parsed.success) throw unprocessable('Workflow definition is invalid', parsed.error.issues)
    const definition = parsed.data
    const current = await currentWorkflow(ctx.orgId)
    if (current.version.id !== input.baseVersionId)
      throw conflict('Another admin published changes since you started editing. Reload and try again.', 'stale_version')
    if (definition.templateKey !== current.definition.templateKey) throw unprocessable('templateKey cannot change')
    const issues = validateDefinition(definition, current.definition)
    if (issues.length) throw unprocessable('Workflow definition is invalid', issues)

    const active = new Set(activeStages(definition).map((s) => s.id))
    const retired = definition.stages.filter((s) => s.retired).map((s) => s.id)
    const mappings = new Map((input.stageMappings ?? []).map((m) => [m.fromStageId, m.toStageId]))
    const openJobsByStage = await db.opportunity.groupBy({
      by: ['stageId'],
      where: { organizationId: ctx.orgId, deletedAt: null, stageId: { in: retired } },
      _count: true,
    })
    for (const row of openJobsByStage) {
      const target = mappings.get(row.stageId)
      if (!target)
        throw unprocessable(`Stage "${row.stageId}" still has ${row._count} job(s). Choose a stage to move them to.`, {
          stageId: row.stageId,
          jobs: row._count,
        })
      if (!active.has(target)) throw unprocessable(`Cannot move jobs into "${target}" because it is not an active stage`)
    }

    const version = await transaction(async (tx) => {
      const created = await tx.workflowVersion.create({
        data: {
          organizationId: ctx.orgId,
          templateKey: definition.templateKey,
          version: current.version.version + 1,
          definition: definition as unknown as Prisma.InputJsonValue,
          publishedById: ctx.userId,
          changeNote: input.changeNote ?? null,
        },
      })
      for (const row of openJobsByStage) {
        const toStageId = mappings.get(row.stageId)!
        const jobs = await tx.opportunity.findMany({
          where: { organizationId: ctx.orgId, deletedAt: null, stageId: row.stageId },
          select: { id: true, contactId: true },
        })
        for (const job of jobs) {
          await tx.stageTransition.create({
            data: {
              organizationId: ctx.orgId,
              opportunityId: job.id,
              workflowVersionId: created.id,
              kind: 'ADMIN_MAPPING',
              fromStageId: row.stageId,
              toStageId,
              reason: `Stage retired in workflow v${created.version}`,
              actorId: ctx.userId,
            },
          })
          await tx.opportunity.update({
            where: { id: job.id },
            data: { stageId: toStageId, stageEnteredAt: new Date(), workflowVersionId: created.id },
          })
          await appendActivity(tx, {
            organizationId: ctx.orgId,
            type: 'stage.changed',
            category: 'WORK',
            actorType: 'USER',
            actorId: ctx.userId,
            verification: 'SYSTEM_RECORDED',
            opportunityId: job.id,
            contactId: job.contactId,
            stageId: toStageId,
            workflowVersionId: created.id,
            payload: { fromStageId: row.stageId, toStageId, kind: 'ADMIN_MAPPING' },
          })
        }
      }
      await appendActivity(tx, {
        organizationId: ctx.orgId,
        type: 'workflow.published',
        category: 'SYSTEM',
        actorType: 'USER',
        actorId: ctx.userId,
        verification: 'SYSTEM_RECORDED',
        workflowVersionId: created.id,
        note: input.changeNote ?? null,
        payload: { version: created.version, mappedStages: openJobsByStage.map((r) => r.stageId) },
      })
      return created
    })
    return this.out(ctx.orgId, version, definition)
  }

  private async out(orgId: string, version: { id: string; version: number; templateKey: string; publishedAt: Date }, definition: unknown) {
    const counts = await db.opportunity.groupBy({
      by: ['stageId'],
      where: { organizationId: orgId, deletedAt: null, status: { in: ['OPEN', 'WON', 'ON_HOLD'] } },
      _count: true,
    })
    return {
      versionId: version.id,
      version: version.version,
      templateKey: version.templateKey,
      publishedAt: version.publishedAt,
      definition,
      stageCounts: counts.map((c) => ({ stageId: c.stageId, openJobs: c._count })),
    }
  }
}

export class ResourceService {
  async list(auth: AuthContext) {
    const ctx = requireOrg(auth)
    const rows = await db.resource.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    return rows.map(resourceOut)
  }

  async create(auth: AuthContext, input: ResourceInput) {
    const ctx = requirePermission(auth, 'settings.manage')
    await this.checkStages(ctx.orgId, input.stageIds)
    const row = await db.resource.create({
      data: {
        organizationId: ctx.orgId,
        label: input.label!,
        url: assertHttpUrl(input.url!),
        description: input.description ?? null,
        stageIds: input.stageIds ?? [],
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    })
    return resourceOut(row)
  }

  async update(auth: AuthContext, id: string, input: ResourceInput) {
    const ctx = requirePermission(auth, 'settings.manage')
    const existing = await db.resource.findFirst({ where: { id, organizationId: ctx.orgId } })
    if (!existing) throw notFound('Resource')
    await this.checkStages(ctx.orgId, input.stageIds)
    const row = await db.resource.update({
      where: { id },
      data: {
        ...input,
        url: input.url ? assertHttpUrl(input.url) : undefined,
        stageIds: input.stageIds ?? undefined,
      },
    })
    return resourceOut(row)
  }

  private async checkStages(orgId: string, stageIds?: string[]) {
    if (!stageIds?.length) return
    const { definition } = await currentWorkflow(orgId)
    const known = new Set(definition.stages.map((s) => s.id))
    const unknown = stageIds.filter((s) => !known.has(s))
    if (unknown.length) throw unprocessable(`Unknown stage(s): ${unknown.join(', ')}`)
  }
}

type ResourceInput = {
  label?: string
  url?: string
  description?: string | null
  stageIds?: string[]
  sortOrder?: number
  isActive?: boolean
}

function resourceOut(r: {
  id: string
  label: string
  url: string
  description: string | null
  stageIds: unknown
  sortOrder: number
  isActive: boolean
}) {
  return {
    id: r.id,
    label: r.label,
    url: r.url,
    description: r.description,
    stageIds: Array.isArray(r.stageIds) ? (r.stageIds as string[]) : [],
    sortOrder: r.sortOrder,
    isActive: r.isActive,
  }
}

export function assertHttpUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw unprocessable('Enter a full URL starting with https://')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw unprocessable('Only http(s) links are allowed')
  return parsed.toString()
}
