import { useMemo } from 'react'
import { useWorkflow, type FieldDef, type OptionDef, type StageDef, type WorkflowDefinition } from '@project/sdk'

export type WorkflowView = ReturnType<typeof buildView>

/** Normalized, read-only helpers over the company's published workflow configuration. */
function buildView(def: WorkflowDefinition, versionId: string) {
  const stages = [...def.stages].sort((a, b) => a.order - b.order)
  const active = stages.filter((s) => !s.retired)
  const fields = new Map(def.fields.map((f) => [f.id, f]))
  const byBinding = new Map(def.fields.filter((f) => f.binding).map((f) => [f.binding!, f]))
  const stageIndex = (id: string) => active.findIndex((s) => s.id === id)
  return {
    def,
    versionId,
    terms: def.terminology,
    stages,
    active,
    stage: (id: string | null | undefined): StageDef | undefined => stages.find((s) => s.id === id),
    stageLabel: (id: string | null | undefined) => stages.find((s) => s.id === id)?.label ?? id ?? '',
    stageIndex,
    nextStage: (id: string) => active[stageIndex(id) + 1],
    field: (id: string): FieldDef | undefined => fields.get(id),
    fieldFor: (binding: string): FieldDef | undefined => byBinding.get(binding),
    options: (fieldId: string, includeValue?: string | null): OptionDef[] =>
      (fields.get(fieldId)?.options ?? []).filter((o) => !o.retired || o.id === includeValue),
    optionLabel: (fieldId: string | undefined, id: string | null | undefined) =>
      id ? fields.get(fieldId ?? '')?.options?.find((o) => o.id === id)?.label ?? id : null,
    bindingOptionLabel: (binding: string, id: string | null | undefined) =>
      id ? byBinding.get(binding)?.options?.find((o) => o.id === id)?.label ?? id : null,
    methodLabel: (id: string | null | undefined) => def.activity.methods.find((m) => m.id === id)?.label ?? id ?? '',
    outcomeLabel: (id: string | null | undefined) => def.activity.outcomes.find((o) => o.id === id)?.label ?? id ?? '',
  }
}

export function useWorkflowView() {
  const q = useWorkflow()
  const view = useMemo(() => (q.data ? buildView(q.data.definition, q.data.versionId) : null), [q.data])
  return { ...q, view }
}
