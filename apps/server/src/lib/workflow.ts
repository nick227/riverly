import { db } from '@project/db'
import { workflowDefinitionSchema, activeStages, type WorkflowDefinition } from '@project/shared'
import { notFound } from './errors'

// The latest published version is the company's effective configuration. Jobs keep the
// version they were created/mapped under for history; labels always render from the latest.
export async function currentWorkflow(organizationId: string) {
  const version = await db.workflowVersion.findFirst({
    where: { organizationId },
    orderBy: { version: 'desc' },
  })
  if (!version) throw notFound('Workflow')
  return { version, definition: workflowDefinitionSchema.parse(version.definition) as WorkflowDefinition }
}

export function firstStageId(def: WorkflowDefinition) {
  const first = activeStages(def)[0]
  if (!first) throw new Error('Workflow has no active stages')
  return first.id
}
