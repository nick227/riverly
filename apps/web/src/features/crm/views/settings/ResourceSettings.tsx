import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import type { Resource } from '@project/sdk'
import { useResources, useSaveResource } from '@project/sdk'
import { Button, Checkbox, Input } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { EmptyState, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { useWorkflowView } from '../../config/workflow'

/** Lightweight, stage-aware links to company documents and tools. No workflow gating. */
export function ResourceSettings() {
  const resources = useResources()
  const { view } = useWorkflowView()
  const [editing, setEditing] = useState<Resource | 'new' | null>(null)
  if (resources.isLoading || !view) return <SkeletonList rows={3} />
  return (
    <Card>
      <CardHeader
        title="Resources"
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus aria-hidden /> Add resource
          </Button>
        }
      />
      {resources.data?.length ? (
        <div className="list">
          {resources.data.map((r) => (
            <div key={r.id} className="list__row">
              <div className="stack gap-1 grow" style={{ minWidth: 0 }}>
                <a className="text text--sm text--medium link" href={r.url} target="_blank" rel="noreferrer">
                  {r.label} <ExternalLink size={12} aria-hidden style={{ display: 'inline' }} />
                </a>
                <span className="row row--wrap gap-1">
                  {r.stageIds.length ? r.stageIds.map((s) => <Badge key={s} tone="outline">{view.stageLabel(s)}</Badge>) : <span className="text text--xs text--muted">Not shown on any stage</span>}
                </span>
              </div>
              {!r.isActive ? <Badge>Hidden</Badge> : null}
              <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                Edit
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No resources yet. Add guides, checklists or templates your team uses at each stage." />
      )}
      {editing ? <ResourceForm resource={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  )
}

function ResourceForm({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const save = useSaveResource()
  const { view } = useWorkflowView()
  const [v, setV] = useState({ label: resource?.label ?? '', url: resource?.url ?? '', description: resource?.description ?? '', stageIds: resource?.stageIds ?? [], isActive: resource?.isActive ?? true })
  return (
    <Overlay
      open
      onRequestClose={onClose}
      title={resource ? 'Edit resource' : 'Add resource'}
      footer={
        <>
          <Checkbox label="Visible to the team" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
          <Button variant="primary" disabled={!v.label || !v.url} loading={save.isPending} onClick={() => save.mutate({ id: resource?.id, ...v, description: v.description || null }, { onSuccess: () => (toast.success('Resource saved'), onClose()), onError: (e) => toast.error(e) })}>
            Save
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label="Label">{(id) => <Input id={id} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} autoFocus />}</Field>
        <Field label="Link">{(id) => <Input id={id} type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" />}</Field>
        <Field label="Description">{(id) => <Input id={id} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        <div className="stack gap-2">
          <span className="field__label">Show on stages</span>
          <div className="grid grid--3 gap-2">
            {view?.active.map((s) => (
              <Checkbox key={s.id} label={s.label} checked={v.stageIds.includes(s.id)} onChange={(e) => setV({ ...v, stageIds: e.target.checked ? [...v.stageIds, s.id] : v.stageIds.filter((x) => x !== s.id) })} />
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
