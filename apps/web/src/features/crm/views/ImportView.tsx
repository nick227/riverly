import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import type { ImportPreview, ImportRun } from '@project/sdk'
import { usePreviewImport, useRunImport } from '@project/sdk'
import { Button, ButtonLink, Checkbox, Input, Select } from '@/components/primitives/Controls'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Notice } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { toast } from '@/components/patterns/Toast'

const TARGET_LABELS: Record<string, string> = {
  name: 'Full name',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  addressLine: 'Street address',
  city: 'City',
  region: 'State',
  postalCode: 'ZIP',
  notes: 'Notes',
  jobTitle: 'Service / job',
  propertyAddress: 'Property address',
  inquiry: 'Inquiry',
  receivedAt: 'Lead date',
}

/** CSV import: preview → map columns → run. Original rows are kept; nothing merges silently. */
export default function ImportView() {
  const preview = usePreviewImport()
  const run = useRunImport()
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null)
  const [info, setInfo] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [createJobs, setCreateJobs] = useState(false)
  const [jobTitle, setJobTitle] = useState('Past client')
  const [sourceName, setSourceName] = useState('')
  const [result, setResult] = useState<ImportRun | null>(null)

  async function choose(f: File | undefined) {
    if (!f) return
    if (f.size > 5_000_000) return toast.error(new Error('Import files up to 5 MB at a time'))
    const csv = await f.text()
    setFile({ name: f.name, csv })
    setResult(null)
    setSourceName(f.name.replace(/\.csv$/i, ''))
    preview.mutate({ fileName: f.name, csv }, { onSuccess: (p) => (setInfo(p), setMapping(p.suggestedMapping)), onError: (e) => toast.error(e) })
  }

  return (
    <main className="crm-page crm-page--narrow">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--2">Import contacts</h1>
          <p className="text text--muted">Upload a CSV of past clients or leads. Each row is kept as an original source record.</p>
        </div>
        <ButtonLink to="/contacts" variant="ghost">
          Back to contacts
        </ButtonLink>
      </div>

      {result ? (
        <Card className="stack gap-6">
          <CardHeader title={`Imported ${result.fileName}`} />
          <div className="grid grid--4 gap-4">
            <Stat value={result.created} label="New contacts" />
            <Stat value={result.linked} label="Linked to existing" />
            <Stat value={result.duplicatesFlagged} label="Need review" />
            <Stat value={result.errors} label="Rows skipped" />
          </div>
          {result.issues.length ? (
            <Notice tone="warning">
              <ul>
                {result.issues.slice(0, 10).map((i) => (
                  <li key={i.rowNumber}>
                    Row {i.rowNumber}: {i.message}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
          <div className="action-bar">
            {result.duplicatesFlagged ? (
              <ButtonLink to="/contacts/review" variant="primary">
                Review possible matches
              </ButtonLink>
            ) : null}
            <ButtonLink to="/contacts?layout=directory">Open contacts</ButtonLink>
            <Button variant="ghost" onClick={() => (setResult(null), setFile(null), setInfo(null))}>
              Import another file
            </Button>
          </div>
        </Card>
      ) : (
        <div className="stack gap-6">
          <Card>
            <label className="empty" style={{ cursor: 'pointer', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
              <Upload aria-hidden />
              <span>{file ? file.name : 'Choose a CSV file'}</span>
              <input type="file" accept=".csv,text/csv" hidden onChange={(e) => void choose(e.target.files?.[0])} />
            </label>
          </Card>

          {info ? (
            <Card className="stack gap-6">
              <CardHeader title={`Map ${info.rowCount} rows`} />
              <div className="field-group">
                {info.targetFields.map((t) => (
                  <Field key={t} label={TARGET_LABELS[t] ?? t}>
                    {(id) => (
                      <Select
                        id={id}
                        value={mapping[t] ?? ''}
                        onChange={(e) => {
                          const next = { ...mapping }
                          if (e.target.value) next[t] = e.target.value
                          else delete next[t]
                          setMapping(next)
                        }}
                        placeholder="— not imported —"
                        options={info.headers.map((h) => ({ value: h, label: h }))}
                      />
                    )}
                  </Field>
                ))}
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>{info.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {info.sampleRows.map((r, i) => (
                      <tr key={i}>{r.map((c, j) => <td key={j} className="text--truncate" style={{ maxWidth: 200 }}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid--2 gap-4">
                <Field label="Source name" hint="Shown on each contact’s provenance">{(id) => <Input id={id} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />}</Field>
                <div className="stack gap-2">
                  <Checkbox label="Create a job for each new contact" checked={createJobs} onChange={(e) => setCreateJobs(e.target.checked)} />
                  {createJobs ? <Input aria-label="Default job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Default job title" /> : null}
                </div>
              </div>
              <Notice>Rows matching one contact by email and name are linked. Any other possible match goes to review. Identical rows imported again are skipped.</Notice>
              <div className="action-bar">
                <Button
                  variant="primary"
                  loading={run.isPending}
                  disabled={!mapping.name && !mapping.firstName}
                  onClick={() =>
                    file &&
                    run.mutate(
                      { fileName: file.name, csv: file.csv, mapping, sourceName: sourceName || undefined, createJobs, defaultJobTitle: createJobs ? jobTitle : undefined },
                      { onSuccess: (r) => (setResult(r), toast.success('Import finished')), onError: (e) => toast.error(e) },
                    )
                  }
                >
                  Import {info.rowCount} rows
                </Button>
                {!mapping.name && !mapping.firstName ? <span className="text text--sm text--muted">Map a name column to continue.</span> : null}
              </div>
            </Card>
          ) : null}
        </div>
      )}
      <p className="text text--xs text--muted mt-6">
        Imports are recorded in <Link className="link" to="/settings/intake">Settings → Lead intake</Link>.
      </p>
    </main>
  )
}
