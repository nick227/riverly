import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { FieldDef, OptionDef, StageDef, WorkflowDefinition } from '@project/sdk'
import { usePublishWorkflow, useWorkflow } from '@project/sdk'
import { Button, Checkbox, IconButton, Input, Select, Textarea } from '@/components/primitives/Controls'
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

/**
 * Edits a draft of the published definition and publishes an immutable new version.
 * IDs are generated once and never edited; removal is "retire", never delete.
 */
export function WorkflowSettings() {
  const wf = useWorkflow()
  const publish = usePublishWorkflow()
  const [draft, setDraft] = useState<WorkflowDefinition | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
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
        changeNote: note || undefined,
      },
      {
        onSuccess: (data) => {
          setDraft(structuredClone(data.definition))
          setNote('')
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
            <span className="text text--sm text--strong">Version {wf.data.version}</span>
            <span className="text text--xs text--muted">Published {dateOnly(wf.data.publishedAt)}. Jobs keep their history; labels update everywhere on publish.</span>
          </div>
          <div className="row gap-2">
            <Input aria-label="Change note" placeholder="What changed? (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 260 }} />
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
        <CardHeader title="Vocabulary" />
        <div className="grid grid--4 gap-4">
          {(['contact', 'opportunity', 'owner', 'activity'] as const).map((k) => (
            <Field key={k} label={{ contact: 'Contact', opportunity: 'Job', owner: 'Owner role', activity: 'Activity' }[k]}>
              {(id) => <Input id={id} value={draft.terminology[k]} onChange={(e) => update((d) => (d.terminology[k] = e.target.value))} />}
            </Field>
          ))}
        </div>
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
                <IconButton size="sm" label={open === s.id ? 'Collapse' : 'Configure'} icon={open === s.id ? <ChevronDown /> : <ChevronRight />} onClick={() => setOpen(open === s.id ? null : s.id)} />
                <Input aria-label={`Label for ${s.id}`} value={s.label} onChange={(e) => updateStage(s.id, { label: e.target.value })} disabled={s.retired} style={{ maxWidth: 280 }} />
                <span className="text text--xs text--muted grow">
                  id: {s.id} · {counts[s.id] ?? 0} active jobs
                </span>
                {s.retired ? <Badge tone="outline">Retired</Badge> : null}
                <IconButton size="sm" label="Move up" icon={<ArrowUp />} onClick={() => move(s.id, -1)} disabled={i === 0} />
                <IconButton size="sm" label="Move down" icon={<ArrowDown />} onClick={() => move(s.id, 1)} disabled={i === stages.length - 1} />
                <Button size="sm" variant={s.retired ? 'secondary' : 'ghost'} onClick={() => updateStage(s.id, { retired: !s.retired })} disabled={!s.retired && active.length <= 1}>
                  {s.retired ? 'Restore' : 'Retire'}
                </Button>
              </div>
              {open === s.id ? <StageConfig stage={s} fields={draft.fields} onChange={(patch) => updateStage(s.id, patch)} /> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Fields and options" />
        <div className="stack gap-5">
          {draft.fields.map((f) => (
            <FieldConfig key={f.id} field={f} onChange={(patch) => update((d) => Object.assign(d.fields.find((x) => x.id === f.id)!, patch))} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Contact attempt choices" />
        <div className="grid grid--2 gap-6">
          <OptionsEditor label="Methods" options={draft.activity.methods} onChange={(methods) => update((d) => (d.activity.methods = methods))} />
          <OptionsEditor label="Outcomes" options={draft.activity.outcomes} onChange={(outcomes) => update((d) => (d.activity.outcomes = outcomes))} />
        </div>
      </Card>
    </div>
  )
}

function StageConfig({ stage, fields, onChange }: { stage: StageDef; fields: FieldDef[]; onChange: (patch: Partial<StageDef>) => void }) {
  const toggle = (id: string, on: boolean) => onChange({ fieldIds: on ? [...stage.fieldIds, id] : stage.fieldIds.filter((f) => f !== id) })
  return (
    <div className="card card--subtle stack gap-4">
      <div className="grid grid--2 gap-4">
        <Field label="Primary action label" hint="Button that moves a job onward from this stage">
          {(id) => <Input id={id} value={stage.primaryActionLabel ?? ''} onChange={(e) => onChange({ primaryActionLabel: e.target.value || undefined })} placeholder="Move to next stage" />}
        </Field>
        <Field label="Short description">{(id) => <Input id={id} value={stage.description ?? ''} onChange={(e) => onChange({ description: e.target.value || undefined })} maxLength={280} />}</Field>
      </div>
      <Field label="Instructions for the team" hint="Optional. Shown on the stage; never a required checklist.">
        {(id) => <Textarea id={id} rows={2} value={stage.instructions ?? ''} onChange={(e) => onChange({ instructions: e.target.value || undefined })} maxLength={1000} />}
      </Field>
      <div className="stack gap-2">
        <span className="field__label">Controls on this stage (up to four)</span>
        <div className="grid grid--3 gap-2">
          {fields
            .filter((f) => !f.retired)
            .map((f) => (
              <Checkbox key={f.id} label={`${f.label}`} checked={stage.fieldIds.includes(f.id)} disabled={!stage.fieldIds.includes(f.id) && stage.fieldIds.length >= 4} onChange={(e) => toggle(f.id, e.target.checked)} />
            ))}
        </div>
      </div>
    </div>
  )
}

function FieldConfig({ field, onChange }: { field: FieldDef; onChange: (patch: Partial<FieldDef>) => void }) {
  const hasOptions = field.type === 'select' || field.type === 'multi_select'
  return (
    <div className="stack gap-2">
      <div className="row row--wrap gap-2">
        <Input aria-label={`Label for ${field.id}`} value={field.label} onChange={(e) => onChange({ label: e.target.value })} style={{ maxWidth: 260 }} />
        <Badge tone="outline">{field.type.replace('_', ' ')}</Badge>
        <span className="text text--xs text--muted grow">id: {field.id}</span>
        <Checkbox label="Visible" checked={field.visible !== false} onChange={(e) => onChange({ visible: e.target.checked })} />
      </div>
      {hasOptions ? <OptionsEditor label="Options" options={field.options ?? []} onChange={(options) => onChange({ options })} inset /> : null}
    </div>
  )
}

function OptionsEditor({ label, options, onChange, inset }: { label: string; options: OptionDef[]; onChange: (o: OptionDef[]) => void; inset?: boolean }) {
  const [adding, setAdding] = useState('')
  return (
    <div className="stack gap-2" style={inset ? { paddingLeft: 'var(--space-6)' } : undefined}>
      <span className="field__label">{label}</span>
      {options.map((o, i) => (
        <div key={o.id} className="row gap-2">
          <Input size_="sm" aria-label={`Option ${o.id}`} value={o.label} disabled={o.retired} onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} style={{ maxWidth: 260 }} />
          <span className="text text--xs text--muted grow">{o.id}</span>
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
