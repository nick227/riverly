import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { OptionDef, StageDef, WorkflowDefinition } from '@project/sdk'
import { usePublishWorkflow, useWorkflow } from '@project/sdk'
import { Button, IconButton, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { dateOnly } from '@/lib/format'

const slug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'n_$1') || 'item'

function uniqueId(base: string, taken: string[]) {
  let id = slug(base)
  let i = 2
  while (taken.includes(id)) id = `${slug(base)}_${i++}`
  return id
}

const VOCABULARY = { opportunity: 'Job', contact: 'Contact', owner: 'Owner role', activity: 'Activity' } as const

/**
 * Edits a draft of the published definition and publishes an immutable new version.
 * Only the workflow itself is editable here (stages, field options, vocabulary); everything
 * else in the definition (field wiring, contact attempt choices, IDs) is predefined and
 * published back unchanged. Removal is "retire", never delete.
 */
export function WorkflowSettings() {
  const wf = useWorkflow()
  const publish = usePublishWorkflow()
  const [draft, setDraft] = useState<WorkflowDefinition | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])

  useEffect(() => {
    if (wf.data && !draft) setDraft(structuredClone(wf.data.definition))
  }, [wf.data, draft])

  const counts = useMemo(() => Object.fromEntries((wf.data?.stageCounts ?? []).map((c) => [c.stageId, c.openJobs])), [wf.data])
  const dirty = useMemo(() => !!draft && !!wf.data && JSON.stringify(draft) !== JSON.stringify(wf.data.definition), [draft, wf.data])
  if (wf.isLoading || !draft || !wf.data) return <SkeletonList rows={4} height={80} />

  const stages = [...draft.stages].sort((a, b) => a.order - b.order)
  const active = stages.filter((s) => !s.retired)
  const optionFields = draft.fields.filter((f) => !f.retired && (f.type === 'select' || f.type === 'multi_select'))
  const needsMapping = stages.filter((s) => s.retired && !wf.data!.definition.stages.find((p) => p.id === s.id)?.retired && (counts[s.id] ?? 0) > 0)

  const update = (fn: (d: WorkflowDefinition) => void) =>
    setDraft((d) => {
      const next = structuredClone(d!)
      fn(next)
      return next
    })
  const updateStage = (id: string, patch: Partial<StageDef>) => update((d) => Object.assign(d.stages.find((s) => s.id === id)!, patch))
  const move = (id: string, dir: -1 | 1) =>
    update((d) => {
      const sorted = [...d.stages].sort((a, b) => a.order - b.order)
      const i = sorted.findIndex((s) => s.id === id)
      const j = i + dir
      if (j < 0 || j >= sorted.length) return
      ;[sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!]
      sorted.forEach((s, k) => (d.stages.find((x) => x.id === s.id)!.order = k + 1))
    })

  function submit() {
    setIssues([])
    publish.mutate(
      {
        baseVersionId: wf.data!.versionId,
        definition: draft!,
        stageMappings: needsMapping.map((s) => ({ fromStageId: s.id, toStageId: mappings[s.id] ?? '' })),
      },
      {
        onSuccess: (data) => {
          setDraft(structuredClone(data.definition))
          setMappings({})
          toast.success(`Published version ${data.version}`)
        },
        onError: (e) => {
          const details = (e as Error & { details?: unknown }).details
          setIssues(Array.isArray(details) ? details.map((d: { message?: string; path?: unknown }) => `${Array.isArray(d.path) ? d.path.join('.') : (d.path ?? '')}: ${d.message}`) : [])
          toast.error(e)
        },
      },
    )
  }

  return (
    <div className="stack gap-6">
      <Card>
        <div className="row row--between row--wrap gap-3">
          <div className="stack gap-1">
            <span className="text text--sm text--strong">{dirty ? 'Unpublished changes' : 'Workflow is up to date'}</span>
            <span className="text text--xs text--muted">Version {wf.data.version} · published {dateOnly(wf.data.publishedAt)}. Jobs keep their history; labels update everywhere on publish.</span>
          </div>
          <div className="row gap-2">
            <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(structuredClone(wf.data!.definition))}>
              Discard
            </Button>
            <Button variant="primary" disabled={!dirty || needsMapping.some((s) => !mappings[s.id])} loading={publish.isPending} onClick={submit}>
              Publish changes
            </Button>
          </div>
        </div>
        {needsMapping.length ? (
          <div className="mt-4">
            <Notice tone="warning">
              <div className="stack gap-2">
                <span>Retired stages still hold jobs. Choose where those jobs move — each move is logged on the job.</span>
                {needsMapping.map((s) => (
                  <div key={s.id} className="row gap-2">
                    <span className="text text--sm" style={{ minWidth: 180 }}>
                      {s.label} ({counts[s.id]} jobs) →
                    </span>
                    <Select size_="sm" aria-label={`Move jobs from ${s.label}`} value={mappings[s.id] ?? ''} onChange={(e) => setMappings({ ...mappings, [s.id]: e.target.value })} placeholder="Choose a stage" options={active.map((a) => ({ value: a.id, label: a.label }))} style={{ width: 220 }} />
                  </div>
                ))}
              </div>
            </Notice>
          </div>
        ) : null}
        {issues.length ? (
          <div className="mt-4">
            <Notice tone="danger">
              <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </Notice>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Stages"
          actions={
            <Button
              size="sm"
              onClick={() =>
                update((d) => {
                  const id = uniqueId('New stage', d.stages.map((s) => s.id))
                  d.stages.push({ id, label: 'New stage', order: d.stages.length + 1, fieldIds: [], emailTemplateKeys: [] })
                  setOpen(id)
                })
              }
            >
              <Plus aria-hidden /> Add stage
            </Button>
          }
        />
        <div className="list">
          {stages.map((s, i) => (
            <div key={s.id} className="stack gap-3" style={{ padding: 'var(--space-3) 0', borderTop: i ? 'var(--border-width) solid var(--color-border)' : undefined }}>
              <div className="row gap-2">
                <IconButton size="sm" label={open === s.id ? 'Hide instructions' : 'Edit instructions'} icon={open === s.id ? <ChevronDown /> : <ChevronRight />} onClick={() => setOpen(open === s.id ? null : s.id)} />
                <Input aria-label={`Stage ${i + 1} name`} value={s.label} onChange={(e) => updateStage(s.id, { label: e.target.value })} disabled={s.retired} style={{ maxWidth: 280 }} />
                <span className="text text--xs text--muted grow">{counts[s.id] ? `${counts[s.id]} active jobs` : null}</span>
                {s.retired ? <Badge tone="outline">Retired</Badge> : null}
                <IconButton size="sm" label="Move up" icon={<ArrowUp />} onClick={() => move(s.id, -1)} disabled={i === 0} />
                <IconButton size="sm" label="Move down" icon={<ArrowDown />} onClick={() => move(s.id, 1)} disabled={i === stages.length - 1} />
                <Button size="sm" variant={s.retired ? 'secondary' : 'ghost'} onClick={() => updateStage(s.id, { retired: !s.retired })} disabled={!s.retired && active.length <= 1}>
                  {s.retired ? 'Restore' : 'Retire'}
                </Button>
              </div>
              {open === s.id ? <StageInstructions stage={s} onChange={(instructions) => updateStage(s.id, { instructions })} /> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Field options" />
        <div className="grid grid--2 gap-6">
          {optionFields.map((f) => (
            <OptionsEditor
              key={f.id}
              label={f.label}
              options={f.options ?? []}
              onChange={(options) => update((d) => (d.fields.find((x) => x.id === f.id)!.options = options))}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Vocabulary" />
        <div className="grid grid--4 gap-4">
          {(Object.keys(VOCABULARY) as (keyof typeof VOCABULARY)[]).map((k) => (
            <Field key={k} label={VOCABULARY[k]}>
              {(id) => <Input id={id} value={draft.terminology[k]} onChange={(e) => update((d) => (d.terminology[k] = e.target.value))} />}
            </Field>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Guidance shown on the job's stage workspace (falls back to the stage description). */
function StageInstructions({ stage, onChange }: { stage: StageDef; onChange: (instructions: string | undefined) => void }) {
  return (
    <Field label="Instructions for the team" hint="Optional. Shown on the stage; never a required checklist.">
      {(id) => <Textarea id={id} rows={2} value={stage.instructions ?? stage.description ?? ''} onChange={(e) => onChange(e.target.value || undefined)} maxLength={1000} />}
    </Field>
  )
}

function OptionsEditor({ label, options, onChange }: { label: string; options: OptionDef[]; onChange: (o: OptionDef[]) => void }) {
  const [adding, setAdding] = useState('')
  return (
    <div className="stack gap-2">
      <span className="field__label">{label}</span>
      {options.map((o, i) => (
        <div key={o.id} className="row gap-2">
          <Input size_="sm" aria-label={`${label} option ${i + 1}`} value={o.label} disabled={o.retired} onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} style={{ maxWidth: 260 }} />
          {o.retired ? <Badge tone="outline">Retired</Badge> : null}
          <Button size="sm" variant="ghost" onClick={() => onChange(options.map((x, j) => (j === i ? { ...x, retired: !x.retired } : x)))}>
            {o.retired ? 'Restore' : 'Retire'}
          </Button>
        </div>
      ))}
      <div className="row gap-2">
        <Input size_="sm" aria-label={`New ${label.toLowerCase()} option`} placeholder="Add option" value={adding} onChange={(e) => setAdding(e.target.value)} style={{ maxWidth: 260 }} />
        <Button
          size="sm"
          disabled={!adding.trim()}
          onClick={() => {
            onChange([...options, { id: uniqueId(adding, options.map((o) => o.id)), label: adding.trim() }])
            setAdding('')
          }}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
