import { useState } from 'react'
import { Copy, Plus } from 'lucide-react'
import { useImports, useLeadForms, useSaveLeadForm } from '@project/sdk'
import { Button, Checkbox, Input } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { dateTime } from '@/lib/format'

/** Embeddable website forms and import history. */
export function IntakeSettings() {
  const forms = useLeadForms()
  const imports = useImports()
  const save = useSaveLeadForm()
  const [label, setLabel] = useState('')
  const origin = window.location.origin
  return (
    <div className="stack gap-6">
      <Card>
        <CardHeader title="Website forms" />
        <form className="row gap-2" onSubmit={(e) => (e.preventDefault(), save.mutate({ label, headline: 'Request a free roof inspection' }, { onSuccess: () => (setLabel(''), toast.success('Form created')), onError: (err) => toast.error(err) }))}>
          <Input aria-label="Form name" placeholder="Form name, e.g. Homepage" value={label} onChange={(e) => setLabel(e.target.value)} style={{ maxWidth: 320 }} />
          <Button type="submit" disabled={!label.trim()} loading={save.isPending}>
            <Plus aria-hidden /> Create form
          </Button>
        </form>
        <div className="stack gap-4 mt-6">
          {(forms.data ?? []).map((f) => {
            const url = `${origin}/f/${f.publicToken}`
            const embed = `<iframe src="${url}" style="width:100%;min-height:720px;border:0" title="${f.label}"></iframe>`
            return (
              <div key={f.id} className="card card--subtle stack gap-2">
                <div className="row row--between gap-2">
                  <span className="text text--sm text--strong">{f.label}</span>
                  <Checkbox label="Accepting submissions" checked={f.isActive} onChange={(e) => save.mutate({ id: f.id, isActive: e.target.checked }, { onError: (err) => toast.error(err) })} />
                </div>
                <div className="row gap-2">
                  <Input readOnly aria-label="Embed code" value={embed} onFocus={(e) => e.target.select()} />
                  <Button size="sm" onClick={() => void navigator.clipboard.writeText(embed).then(() => toast.success('Embed code copied'))}>
                    <Copy aria-hidden /> Copy
                  </Button>
                  <a className="button button--ghost button--sm" href={url} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                </div>
                <span className="text text--xs text--muted">Protected by rate limits, a hidden honeypot field and a minimum fill time. Possible duplicates go to review — never merged automatically.</span>
              </div>
            )
          })}
          {!forms.data?.length ? <EmptyState compact title="No forms yet." /> : null}
        </div>
      </Card>
      <Card>
        <CardHeader title="Import history" />
        {imports.data?.length ? (
          <div className="table-wrap">
            <table className="table table--numeric">
              <thead>
                <tr><th>File</th><th>New</th><th>Linked</th><th>To review</th><th>Skipped</th><th>When</th></tr>
              </thead>
              <tbody>
                {imports.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fileName} {r.state !== 'SUCCEEDED' ? <Badge tone="warning">{r.state.toLowerCase().replace('_', ' ')}</Badge> : null}</td>
                    <td>{r.created}</td><td>{r.linked}</td><td>{r.duplicatesFlagged}</td><td>{r.errors}</td>
                    <td>{dateTime(r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact title="No imports yet." />
        )}
      </Card>
    </div>
  )
}
