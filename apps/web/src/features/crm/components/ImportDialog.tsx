import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import type { ImportPreview, ImportRun } from '@project/sdk'
import { usePreviewImport, useRunImport } from '@project/sdk'
import { Button, Checkbox, Input, Select } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Notice, Spinner } from '@/components/patterns/States'
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

/** CSV import in a modal: choose file → map columns → import → result. Nothing merges silently. */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const preview = usePreviewImport()
  const run = useRunImport()
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null)
  const [info, setInfo] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [createJobs, setCreateJobs] = useState(false)
  const [jobTitle, setJobTitle] = useState('Past client')
  const [sourceName, setSourceName] = useState('')
  const [result, setResult] = useState<ImportRun | null>(null)
  const hasName = !!(mapping.name || mapping.firstName)

  async function choose(f: File | undefined) {
    if (!f) return
    if (f.size > 5_000_000) return toast.error(new Error('Import files up to 5 MB at a time'))
    const csv = await f.text()
    setFile({ name: f.name, csv })
    setInfo(null)
    setSourceName(f.name.replace(/\.csv$/i, ''))
    preview.mutate({ fileName: f.name, csv }, { onSuccess: (p) => (setInfo(p), setMapping(p.suggestedMapping)), onError: (e) => toast.error(e) })
  }

  function submit() {
    if (!file) return
    run.mutate(
      { fileName: file.name, csv: file.csv, mapping, sourceName: sourceName || undefined, createJobs, defaultJobTitle: createJobs ? jobTitle : undefined },
      { onSuccess: (r) => (setResult(r), toast.success('Import finished')), onError: (e) => toast.error(e) },
    )
  }

  const footer = result ? (
    <>
      <Button variant="ghost" onClick={() => (setResult(null), setFile(null), setInfo(null))}>
        Import another file
      </Button>
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </>
  ) : (
    <>
      <span className="text text--xs text--muted">{info && !hasName ? 'Map a name column to continue.' : 'Original rows are kept as source records.'}</span>
      <div className="action-bar">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" loading={run.isPending} disabled={!info || !hasName} onClick={submit}>
          {info ? `Import ${info.rowCount} rows` : 'Import'}
        </Button>
      </div>
    </>
  )

  return (
    <Overlay open variant="wide" onRequestClose={onClose} title="Import contacts" footer={footer}>
      {result ? (
        <div className="stack gap-6">
          <div className="grid grid--4 gap-4">
            <Stat value={result.created} label="New contacts" />
            <Stat value={result.linked} label="Linked to existing" />
            <Stat value={result.duplicatesFlagged} label="Need review" />
            <Stat value={result.errors} label="Rows skipped" />
          </div>
          {result.duplicatesFlagged ? (
            <p className="text text--sm text--secondary">
              Possible duplicates were not merged — confirm them in{' '}
              <Link className="link" to="/contacts/review" onClick={onClose}>
                review
              </Link>
              .
            </p>
          ) : null}
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
        </div>
      ) : (
        <div className="stack gap-6">
          <label className="empty" style={{ cursor: 'pointer', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)' }}>
            {preview.isPending ? <Spinner /> : <Upload aria-hidden />}
            <span>{file ? file.name : 'Choose a CSV file'}</span>
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => void choose(e.target.files?.[0])} />
          </label>

          {info ? (
            <>
              <div className="stack gap-3">
                <span className="text text--sm text--strong">Match columns ({info.rowCount} rows)</span>
                <div className="grid grid--3 gap-3">
                  {info.targetFields.map((t) => (
                    <Field key={t} label={TARGET_LABELS[t] ?? t}>
                      {(id) => (
                        <Select
                          id={id}
                          size_="sm"
                          value={mapping[t] ?? ''}
                          onChange={(e) => {
                            const next = { ...mapping }
                            if (e.target.value) next[t] = e.target.value
                            else delete next[t]
                            setMapping(next)
                          }}
                          placeholder="— skip —"
                          options={info.headers.map((h) => ({ value: h, label: h }))}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {info.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.sampleRows.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j} className="text--truncate" style={{ maxWidth: 160 }}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid--2 gap-4">
                <Field label="Source name" hint="Shown on each contact’s provenance">
                  {(id) => <Input id={id} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />}
                </Field>
                <div className="stack gap-2">
                  <Checkbox label="Create a job for each new contact" checked={createJobs} onChange={(e) => setCreateJobs(e.target.checked)} />
                  {createJobs ? <Input aria-label="Default job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Default job title" /> : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </Overlay>
  )
}
