import { z } from 'zod'

// Bounded field registry (doc 06). Generic value types store into OpportunityFieldValue
// or a whitelisted native column; domain controls render native records (appointments,
// attachments, activity, external links) and never store generic JSON blobs.
export const VALUE_FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'datetime',
  'select',
  'multi_select',
  'boolean',
  'money',
  'member',
  'url',
] as const

export const DOMAIN_CONTROL_TYPES = [
  'contact_log', // repeatable contact attempts (method + outcome) → ActivityEvent
  'progress_log', // repeatable free-text updates → ActivityEvent
  'appointment', // Appointment records for this stage
  'participants', // external people / members on the job (inspector, crew)
  'attachment', // files linked to this stage + field
  'gallery', // image attachments linked to this stage + field
  'external_link', // manual invoice/payment/deposit reference (unverified)
  'review_request', // Job Completed review-request action + status
] as const

export const FIELD_TYPES = [...VALUE_FIELD_TYPES, ...DOMAIN_CONTROL_TYPES] as const
export type FieldType = (typeof FIELD_TYPES)[number]

// Native Opportunity columns a field may bind to. Anything else is a custom field.
export const NATIVE_BINDINGS = {
  'opportunity.title': 'text',
  'opportunity.propertyAddress': 'text',
  'opportunity.inquiry': 'textarea',
  'opportunity.leadSourceOptionId': 'select',
  'opportunity.urgencyOptionId': 'select',
  'opportunity.ownerId': 'member',
  'opportunity.nextFollowUpAt': 'datetime',
  'opportunity.estimatedValueCents': 'money',
  'opportunity.contractValueCents': 'money',
} as const satisfies Record<string, FieldType>
export type NativeBinding = keyof typeof NATIVE_BINDINGS

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case and never change')

const label = z.string().trim().min(1).max(80)

export const optionSchema = z.object({
  id,
  label,
  retired: z.boolean().optional(),
})

export const fieldSchema = z.object({
  id,
  label,
  type: z.enum(FIELD_TYPES),
  binding: z.string().optional(),
  options: z.array(optionSchema).optional(),
  editable: z.boolean().default(true),
  visible: z.boolean().default(true),
  retired: z.boolean().optional(),
  // Domain-control settings (whitelisted keys only — never executable config)
  appointmentKind: z.string().max(40).optional(),
  participantRole: z.string().max(40).optional(),
  linkKind: z.enum(['INVOICE', 'PAYMENT', 'DEPOSIT', 'ESTIMATE', 'OTHER']).optional(),
  placeholder: z.string().max(120).optional(),
})

export const stageSchema = z.object({
  id,
  label,
  order: z.number().int().min(0),
  retired: z.boolean().optional(),
  description: z.string().max(280).optional(),
  instructions: z.string().max(1000).optional(),
  fieldIds: z.array(id).max(4, 'A stage highlights at most four controls'),
  primaryActionLabel: z.string().max(40).optional(),
  emailTemplateKeys: z.array(id).max(6).default([]),
})

export const workflowDefinitionSchema = z.object({
  templateKey: id,
  terminology: z.object({
    contact: label,
    opportunity: label,
    owner: label,
    activity: label,
  }),
  stages: z.array(stageSchema).min(1).max(12),
  fields: z.array(fieldSchema),
  activity: z.object({
    methods: z.array(optionSchema).min(1),
    outcomes: z.array(optionSchema).min(1),
  }),
  contactCard: z.object({
    actions: z.array(z.enum(['call', 'text', 'email', 'schedule'])),
    jobFieldIds: z.array(id).max(6),
  }),
})

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>
export type StageDefinition = z.infer<typeof stageSchema>
export type FieldDefinition = z.infer<typeof fieldSchema>
export type OptionDefinition = z.infer<typeof optionSchema>

export function activeStages(def: WorkflowDefinition): StageDefinition[] {
  return def.stages.filter((s) => !s.retired).sort((a, b) => a.order - b.order)
}

export function findField(def: WorkflowDefinition, fieldId: string) {
  return def.fields.find((f) => f.id === fieldId)
}

export function optionLabel(def: WorkflowDefinition, fieldId: string, optionId: string | null | undefined) {
  if (!optionId) return null
  return findField(def, fieldId)?.options?.find((o) => o.id === optionId)?.label ?? optionId
}

export type DefinitionIssue = { path: string; message: string }

/**
 * Structural validation beyond the zod shape: references resolve, IDs are unique,
 * bindings are whitelisted, and — when a previous version exists — no stable ID is
 * dropped or repurposed. Returns an empty list when the definition is publishable.
 */
export function validateDefinition(def: WorkflowDefinition, previous?: WorkflowDefinition): DefinitionIssue[] {
  const issues: DefinitionIssue[] = []
  const dup = (ids: string[], path: string) => {
    const seen = new Set<string>()
    for (const i of ids) {
      if (seen.has(i)) issues.push({ path, message: `Duplicate id "${i}"` })
      seen.add(i)
    }
  }
  dup(def.stages.map((s) => s.id), 'stages')
  dup(def.fields.map((f) => f.id), 'fields')
  dup(def.activity.methods.map((o) => o.id), 'activity.methods')
  dup(def.activity.outcomes.map((o) => o.id), 'activity.outcomes')

  if (activeStages(def).length === 0) issues.push({ path: 'stages', message: 'At least one active stage is required' })

  const fieldIds = new Set(def.fields.map((f) => f.id))
  for (const s of def.stages) {
    for (const fid of s.fieldIds) {
      if (!fieldIds.has(fid)) issues.push({ path: `stages.${s.id}.fieldIds`, message: `Unknown field "${fid}"` })
    }
  }
  for (const fid of def.contactCard.jobFieldIds) {
    if (!fieldIds.has(fid)) issues.push({ path: 'contactCard.jobFieldIds', message: `Unknown field "${fid}"` })
  }

  for (const f of def.fields) {
    if (f.binding) {
      const expected = (NATIVE_BINDINGS as Record<string, FieldType>)[f.binding]
      if (!expected) issues.push({ path: `fields.${f.id}.binding`, message: `Binding "${f.binding}" is not allowed` })
      else if (expected !== f.type)
        issues.push({ path: `fields.${f.id}.type`, message: `Binding ${f.binding} requires type ${expected}` })
    }
    if ((f.type === 'select' || f.type === 'multi_select') && !f.options?.length)
      issues.push({ path: `fields.${f.id}.options`, message: 'Select fields need at least one option' })
    if (f.options) dup(f.options.map((o) => o.id), `fields.${f.id}.options`)
  }

  if (previous) {
    const keep = (prevIds: string[], nextIds: Set<string>, path: string) => {
      for (const pid of prevIds)
        if (!nextIds.has(pid)) issues.push({ path, message: `"${pid}" was removed; retire it instead of deleting` })
    }
    keep(previous.stages.map((s) => s.id), new Set(def.stages.map((s) => s.id)), 'stages')
    keep(previous.fields.map((f) => f.id), fieldIds, 'fields')
    keep(previous.activity.methods.map((o) => o.id), new Set(def.activity.methods.map((o) => o.id)), 'activity.methods')
    keep(previous.activity.outcomes.map((o) => o.id), new Set(def.activity.outcomes.map((o) => o.id)), 'activity.outcomes')
    for (const pf of previous.fields) {
      const nf = def.fields.find((f) => f.id === pf.id)
      if (!nf) continue
      if (nf.type !== pf.type)
        issues.push({ path: `fields.${pf.id}.type`, message: 'A field type cannot change; add a new field instead' })
      if (pf.options)
        keep(pf.options.map((o) => o.id), new Set((nf.options ?? []).map((o) => o.id)), `fields.${pf.id}.options`)
    }
  }
  return issues
}
