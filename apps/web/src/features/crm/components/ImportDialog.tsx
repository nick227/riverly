import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  RefreshCw,
  ShoppingBag,
  Upload,
  Zap,
} from 'lucide-react'
import type { ImportPreview, ImportRun, SyncResult } from '@project/sdk'
import {
  useIntegration,
  usePreviewImport,
  useRunImport,
  useSyncIntegration,
  useUpdateIntegration,
} from '@project/sdk'
import { Button, Checkbox, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Segmented } from '@/components/patterns/Segmented'
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

type TabKey = 'csv' | 'woocommerce' | 'hubspot' | 'zapier'

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>('csv')

  return (
    <Overlay open variant="wide" onRequestClose={onClose} title="Import Contacts">
      {/* Fixed-height container to guarantee modal height consistency across all tabs */}
      <div className="flex flex-col h-[540px] max-h-[calc(85vh-80px)] min-h-[500px]">
        {/* Pinned Tab Bar */}
        <div className="shrink-0 pb-3 border-b border-border">
          <Segmented
            label="Import options"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'csv',
                label: (
                  <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <FileText size={14} className="shrink-0" /> CSV File
                  </span>
                ),
              },
              {
                value: 'woocommerce',
                label: (
                  <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <ShoppingBag size={14} className="shrink-0" /> WooCommerce
                  </span>
                ),
              },
              {
                value: 'hubspot',
                label: (
                  <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Globe size={14} className="shrink-0" /> HubSpot
                  </span>
                ),
              },
              {
                value: 'zapier',
                label: (
                  <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Zap size={14} className="shrink-0" /> Zapier
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Tab Views */}
        {tab === 'csv' && <CsvImportTab onClose={onClose} />}
        {tab === 'woocommerce' && <WooCommerceImportTab onClose={onClose} />}
        {tab === 'hubspot' && <HubSpotImportTab onClose={onClose} />}
        {tab === 'zapier' && <ZapierImportTab onClose={onClose} />}
      </div>
    </Overlay>
  )
}

/** Tab Header with logo, title, and category guaranteed on the same row */
function TabHeader({
  icon,
  name,
  category,
  subtitle,
  statusBadge,
}: {
  icon: React.ReactNode
  name: string
  category: string
  subtitle: string
  statusBadge?: React.ReactNode
}) {
  return (
    <div className="shrink-0 pb-2.5 mb-2 border-b border-border">
      <div className="flex items-center justify-between gap-3 shrink-0 flex-nowrap">
        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <span className="text text--sm text--strong whitespace-nowrap">{name}</span>
            <Badge tone="outline">{category}</Badge>
          </div>
        </div>
        {statusBadge ? <div className="flex items-center gap-2 shrink-0 flex-nowrap">{statusBadge}</div> : null}
      </div>
      <p className="text text--xs text--muted" style={{ margin: 'var(--space-1) 0 0' }}>
        {subtitle}
      </p>
    </div>
  )
}

/** 1. CSV File Import */
function CsvImportTab({ onClose }: { onClose: () => void }) {
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
    preview.mutate(
      { fileName: f.name, csv },
      { onSuccess: (p) => (setInfo(p), setMapping(p.suggestedMapping)), onError: (e) => toast.error(e) },
    )
  }

  function submit() {
    if (!file) return
    run.mutate(
      {
        fileName: file.name,
        csv: file.csv,
        mapping,
        sourceName: sourceName || undefined,
        createJobs,
        defaultJobTitle: createJobs ? jobTitle : undefined,
      },
      {
        onSuccess: (r) => (setResult(r), toast.success('Import finished')),
        onError: (e) => toast.error(e),
      },
    )
  }

  if (result) {
    return (
      <div className="flex flex-col flex-1 min-h-0 pt-3">
        <TabHeader
          icon={<FileText size={16} className="shrink-0 text--accent" />}
          name="CSV Import"
          category="File Upload"
          subtitle="File processing completed."
          statusBadge={<Badge tone="success"><Check size={12} className="mr-1 shrink-0" />Done</Badge>}
        />

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-4">
          <div className="grid grid--4 gap-3">
            <Stat value={result.created} label="New contacts" />
            <Stat value={result.updated ?? 0} label="Updated records" />
            <Stat value={result.linked} label="Linked records" />
            <Stat value={result.duplicatesFlagged} label="Need review" />
          </div>

          {result.duplicatesFlagged ? (
            <Notice tone="warning">
              <span className="text text--xs">
                {result.duplicatesFlagged} ambiguous matches flagged for safety.{' '}
                <Link className="link" to="/contacts/review" onClick={onClose}>
                  Review collisions in Review Queue →
                </Link>
              </span>
            </Notice>
          ) : null}

          {result.issues.length ? (
            <Notice tone="danger">
              <ul className="text text--xs stack gap-0.5">
                {result.issues.slice(0, 5).map((i) => (
                  <li key={i.rowNumber}>
                    Row {i.rowNumber}: {i.message}
                  </li>
                ))}
              </ul>
            </Notice>
          ) : null}
        </div>

        {/* Lower Right Fixed Footer */}
        <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
          <span className="text text--xs text--muted">Records imported to CRM</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="ghost" onClick={() => (setResult(null), setFile(null), setInfo(null))}>
              Import another CSV
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-3">
      <TabHeader
        icon={<FileText size={16} className="shrink-0 text--accent" />}
        name="CSV File"
        category="Spreadsheet"
        subtitle="Upload a .csv file to import contacts and past customer inquiries."
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-3.5">
        <label
          className="empty"
          style={{
            cursor: 'pointer',
            border: '1px dashed var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}
        >
          {preview.isPending ? <Spinner /> : <Upload size={18} className="shrink-0 text--muted" aria-hidden />}
          <span className="text text--xs text--strong">{file ? file.name : 'Choose a CSV file to upload'}</span>
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => void choose(e.target.files?.[0])} />
        </label>

        {info ? (
          <>
            <div className="stack gap-2">
              <span className="text text--xs text--strong">Map columns ({info.rowCount} rows detected)</span>
              <div className="grid grid--3 gap-2.5">
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

            <div className="table-wrap" style={{ maxHeight: 110, overflowY: 'auto' }}>
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
                        <td key={j} className="text--truncate" style={{ maxWidth: 140 }}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid--2 gap-3">
              <Field label="Source name" hint="Appears on contact provenance">
                {(id) => <Input id={id} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />}
              </Field>
              <div className="stack gap-1.5 pt-4">
                <Checkbox
                  label="Create job inquiry for new contacts"
                  checked={createJobs}
                  onChange={(e) => setCreateJobs(e.target.checked)}
                />
                {createJobs ? (
                  <Input
                    aria-label="Default job title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Default job title"
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Lower Right Fixed Footer */}
      <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
        <span className="text text--xs text--muted truncate">
          {info && !hasName ? 'Map a name column to proceed.' : 'Raw rows are stored as immutable provenance records.'}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={run.isPending} disabled={!info || !hasName} onClick={submit}>
            {info ? `Import ${info.rowCount} rows` : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 2. WooCommerce Import (Full Sync Provider) */
function WooCommerceImportTab({ onClose }: { onClose: () => void }) {
  const integrationQuery = useIntegration('WOOCOMMERCE')
  const syncMutation = useSyncIntegration()
  const updateMutation = useUpdateIntegration()

  const config = (integrationQuery.data?.config as Record<string, string> | null) ?? {}
  const isConfigured = Boolean(integrationQuery.data?.status === 'CONNECTED' || integrationQuery.data?.hasCredentials)
  const [showOverride, setShowOverride] = useState(false)

  const [siteUrl, setSiteUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createJobs, setCreateJobs] = useState(false)
  const [jobTitle, setJobTitle] = useState('WooCommerce Order Inquiry')
  const [saveToSettings, setSaveToSettings] = useState(true)

  // Live progress feedback state
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    if (config.siteUrl) setSiteUrl(config.siteUrl)
    else if (!siteUrl) setSiteUrl('https://demo.peakridgeroofing.test')

    if (config.username) setUsername(config.username)
    else if (!username) setUsername('admin')
  }, [config.siteUrl, config.username])

  const STEPS = [
    'Authenticating via Application Password',
    'Fetching customer records via REST API',
    'Checking many-to-many contact provenance',
    'Upserting contacts and order inquiries',
    'Complete',
  ]

  async function handleImport() {
    setIsSyncing(true)
    setCurrentStep(0)
    const activeUrl = siteUrl || config.siteUrl || 'https://demo.peakridgeroofing.test'
    setLogs([`[${new Date().toLocaleTimeString()}] Starting WooCommerce sync (${activeUrl})...`])
    setResult(null)

    try {
      setCurrentStep(0)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Authenticating with store...`])
      await new Promise((r) => setTimeout(r, 400))

      if (saveToSettings && (showOverride || !isConfigured)) {
        await updateMutation.mutateAsync({
          provider: 'WOOCOMMERCE',
          name: 'WooCommerce Store',
          config: { siteUrl: activeUrl, username },
          credentials: password || undefined,
        })
      }

      setCurrentStep(1)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Fetching customers...`])
      await new Promise((r) => setTimeout(r, 500))

      setCurrentStep(2)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Matching provenance links...`])

      const res = await syncMutation.mutateAsync({
        provider: 'WOOCOMMERCE',
        updateExisting,
        createJobs,
        defaultJobTitle: createJobs ? jobTitle : undefined,
        config: showOverride || !isConfigured ? { siteUrl: activeUrl, username } : undefined,
        credentials: password || undefined,
      })

      setCurrentStep(3)
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Processed: ${res.created} new, ${res.updated} updated, ${res.linked} linked.`,
      ])
      await new Promise((r) => setTimeout(r, 400))

      setCurrentStep(4)
      setResult(res)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Sync completed successfully.`])
      toast.success('WooCommerce sync finished')
    } catch (err) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${(err as Error).message}`])
      toast.error(err)
    } finally {
      setIsSyncing(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col flex-1 min-h-0 pt-3">
        <TabHeader
          icon={<ShoppingBag size={16} className="shrink-0 text--accent" />}
          name="WooCommerce"
          category="Full Sync"
          subtitle="Sync completed successfully."
          statusBadge={<Badge tone="success"><Check size={12} className="mr-1 shrink-0" />Done</Badge>}
        />

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-4">
          <div className="grid grid--4 gap-3">
            <Stat value={result.created} label="New contacts" />
            <Stat value={result.updated} label="Updated existing" />
            <Stat value={result.linked} label="Linked records" />
            <Stat value={result.duplicatesFlagged} label="Need review" />
          </div>

          {result.duplicatesFlagged ? (
            <Notice tone="warning">
              <span className="text text--xs">
                {result.duplicatesFlagged} ambiguous matches flagged for safety.{' '}
                <Link className="link" to="/contacts/review" onClick={onClose}>
                  Review collisions in Review Queue →
                </Link>
              </span>
            </Notice>
          ) : null}

          {logs.length > 0 ? (
            <details className="stack gap-1" style={{ cursor: 'pointer' }}>
              <summary className="text text--xs text--muted select-none">
                View technical logs ({logs.length} entries)
              </summary>
              <div
                style={{
                  maxHeight: 100,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: 'var(--color-surface)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginTop: 'var(--space-1)',
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* Lower Right Fixed Footer */}
        <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
          <span className="text text--xs text--muted">Contacts synced with provenance</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="ghost" onClick={() => (setResult(null), setLogs([]))}>
              Sync again
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-3">
      <TabHeader
        icon={<ShoppingBag size={16} className="shrink-0 text--accent" />}
        name="WooCommerce"
        category="Full Sync"
        subtitle="Sync buyers and order inquiries with idempotent provenance."
        statusBadge={
          <Badge tone={isConfigured ? 'success' : 'neutral'}>
            {isConfigured ? 'Connected in Settings' : 'Not Configured'}
          </Badge>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-3.5">
        {isConfigured && !showOverride ? (
          <div className="card card--subtle p-3 flex items-center justify-between gap-3 flex-nowrap" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="stack gap-0.5 min-w-0">
              <span className="text text--xs text--strong flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={14} className="text--success shrink-0" />
                Connected: {config.siteUrl || siteUrl}
              </span>
              <span className="text text--xs text--muted truncate">
                User: <strong>{config.username || username}</strong> · Saved credentials active
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowOverride(true)} className="shrink-0">
              Edit connection
            </Button>
          </div>
        ) : (
          <div className="stack gap-3">
            <div className="grid grid--2 gap-3">
              <Field label="WordPress / Store URL" hint="Store URL">
                {(id) => (
                  <Input
                    id={id}
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://mystore.com"
                  />
                )}
              </Field>
              <Field label="WordPress Username" hint="Admin user">
                {(id) => (
                  <Input
                    id={id}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                  />
                )}
              </Field>
            </div>

            <Field
              label="Application Password"
              hint={
                integrationQuery.data?.hasCredentials
                  ? 'Stored password active (leave blank to keep)'
                  : 'Generated in WordPress: Users → Profile → Application Passwords'
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={integrationQuery.data?.hasCredentials ? '••••••••••••••••' : 'abcd efgh ijkl mnop'}
                />
              )}
            </Field>

            {isConfigured && showOverride ? (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowOverride(false)}>
                  Cancel editing
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="card card--subtle stack gap-2 p-3" style={{ borderRadius: 'var(--radius-md)' }}>
          <span className="text text--xs text--strong">Sync Options</span>
          <div className="stack gap-1.5">
            <Checkbox
              label="Non-destructive update: preserve existing user notes and custom details"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            <Checkbox
              label="Create job inquiries for new contacts"
              checked={createJobs}
              onChange={(e) => setCreateJobs(e.target.checked)}
            />
            {createJobs ? (
              <Field label="Default Job Title">
                {(id) => <Input id={id} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />}
              </Field>
            ) : null}
            {!isConfigured || showOverride ? (
              <Checkbox
                label="Save credentials to Settings for future 1-click syncs"
                checked={saveToSettings}
                onChange={(e) => setSaveToSettings(e.target.checked)}
              />
            ) : null}
          </div>
        </div>

        {isSyncing ? (
          <div className="stack gap-2.5 card card--subtle p-3" style={{ border: '1px solid var(--color-accent)' }}>
            <div className="flex items-center justify-between">
              <span className="text text--xs text--strong flex items-center gap-2">
                <Spinner /> Synchronizing WooCommerce Records...
              </span>
              <Badge tone="accent">Step {currentStep + 1} of {STEPS.length}</Badge>
            </div>

            <div className="stack gap-1">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text text--xs flex-nowrap">
                  {idx < currentStep ? (
                    <Check size={13} className="text--success shrink-0" />
                  ) : idx === currentStep ? (
                    <RefreshCw size={13} className="text--accent spin shrink-0" />
                  ) : (
                    <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--color-border)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span className={idx === currentStep ? 'text--strong' : idx > currentStep ? 'text--muted' : ''}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <details className="stack gap-1 pt-1" style={{ cursor: 'pointer' }}>
              <summary className="text text--xs text--muted select-none">
                View technical logs ({logs.length} entries)
              </summary>
              <div
                style={{
                  maxHeight: 90,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: 'var(--color-surface)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginTop: 'var(--space-1)',
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </details>
          </div>
        ) : null}
      </div>

      {/* Lower Right Fixed Footer */}
      <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
        <span className="text text--xs text--muted truncate">
          {isConfigured && !showOverride ? 'Using saved connection from Settings' : 'Credentials stored encrypted'}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSyncing}
            disabled={(!isConfigured && (!siteUrl || !username || !password)) || (showOverride && (!siteUrl || !username))}
            onClick={handleImport}
          >
            <ShoppingBag size={14} className="shrink-0" aria-hidden />{' '}
            {isConfigured && !showOverride ? 'Run WooCommerce Sync' : 'Connect & Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 3. HubSpot Import (Full Sync Provider) */
function HubSpotImportTab({ onClose }: { onClose: () => void }) {
  const integrationQuery = useIntegration('HUBSPOT')
  const syncMutation = useSyncIntegration()
  const updateMutation = useUpdateIntegration()

  const isConfigured = Boolean(integrationQuery.data?.status === 'CONNECTED' || integrationQuery.data?.hasCredentials)
  const [showOverride, setShowOverride] = useState(false)
  const [token, setToken] = useState('')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createJobs, setCreateJobs] = useState(false)
  const [saveToSettings, setSaveToSettings] = useState(true)

  const [isSyncing, setIsSyncing] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<SyncResult | null>(null)

  const STEPS = [
    'Validating Private App token',
    'Fetching contacts and CRM properties',
    'Resolving contacts against provenance',
    'Applying idempotent upsert',
    'Complete',
  ]

  async function handleImport() {
    setIsSyncing(true)
    setCurrentStep(0)
    setLogs([`[${new Date().toLocaleTimeString()}] Starting HubSpot CRM sync...`])
    setResult(null)

    try {
      setCurrentStep(0)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Validating token...`])
      await new Promise((r) => setTimeout(r, 400))

      if (saveToSettings && (showOverride || !isConfigured) && token) {
        await updateMutation.mutateAsync({
          provider: 'HUBSPOT',
          name: 'HubSpot CRM',
          credentials: token,
        })
      }

      setCurrentStep(1)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Fetching contacts...`])
      await new Promise((r) => setTimeout(r, 500))

      setCurrentStep(2)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Matching contact records...`])

      const res = await syncMutation.mutateAsync({
        provider: 'HUBSPOT',
        updateExisting,
        createJobs,
        defaultJobTitle: 'HubSpot Inquiry',
        credentials: token || undefined,
      })

      setCurrentStep(3)
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Processed: ${res.created} new, ${res.updated} updated, ${res.linked} linked.`,
      ])
      await new Promise((r) => setTimeout(r, 400))

      setCurrentStep(4)
      setResult(res)
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] HubSpot sync completed.`])
      toast.success('HubSpot contacts imported')
    } catch (err) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${(err as Error).message}`])
      toast.error(err)
    } finally {
      setIsSyncing(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col flex-1 min-h-0 pt-3">
        <TabHeader
          icon={<Globe size={16} className="shrink-0 text--accent" />}
          name="HubSpot CRM"
          category="Full Sync"
          subtitle="Sync completed successfully."
          statusBadge={<Badge tone="success"><Check size={12} className="mr-1 shrink-0" />Done</Badge>}
        />

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-4">
          <div className="grid grid--4 gap-3">
            <Stat value={result.created} label="New contacts" />
            <Stat value={result.updated} label="Updated contacts" />
            <Stat value={result.linked} label="Linked records" />
            <Stat value={result.duplicatesFlagged} label="Need review" />
          </div>

          {result.duplicatesFlagged ? (
            <Notice tone="warning">
              <span className="text text--xs">
                {result.duplicatesFlagged} ambiguous matches flagged for review.{' '}
                <Link className="link" to="/contacts/review" onClick={onClose}>
                  Review collisions in Review Queue →
                </Link>
              </span>
            </Notice>
          ) : null}

          {logs.length > 0 ? (
            <details className="stack gap-1" style={{ cursor: 'pointer' }}>
              <summary className="text text--xs text--muted select-none">
                View technical logs ({logs.length} entries)
              </summary>
              <div
                style={{
                  maxHeight: 100,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: 'var(--color-surface)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginTop: 'var(--space-1)',
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* Lower Right Fixed Footer */}
        <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
          <span className="text text--xs text--muted">Contacts synced with provenance</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="ghost" onClick={() => (setResult(null), setLogs([]))}>
              Sync again
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-3">
      <TabHeader
        icon={<Globe size={16} className="shrink-0 text--accent" />}
        name="HubSpot CRM"
        category="Full Sync"
        subtitle="Batch contacts sync via Private App Token."
        statusBadge={
          <Badge tone={isConfigured ? 'success' : 'neutral'}>
            {isConfigured ? 'Connected in Settings' : 'Not Configured'}
          </Badge>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-3.5">
        {isConfigured && !showOverride ? (
          <div className="card card--subtle p-3 flex items-center justify-between gap-3 flex-nowrap" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="stack gap-0.5 min-w-0">
              <span className="text text--xs text--strong flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={14} className="text--success shrink-0" />
                Connected to HubSpot CRM
              </span>
              <span className="text text--xs text--muted truncate">
                Private App Token saved in Settings active
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowOverride(true)} className="shrink-0">
              Edit token
            </Button>
          </div>
        ) : (
          <div className="stack gap-3">
            <Field
              label="HubSpot Private App Token"
              hint={
                integrationQuery.data?.hasCredentials
                  ? 'Saved token active (leave blank to keep)'
                  : 'Scope: crm.objects.contacts.read (or "demo")'
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={integrationQuery.data?.hasCredentials ? '••••••••••••••••' : 'pat-na1-…'}
                />
              )}
            </Field>
            {isConfigured && showOverride ? (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowOverride(false)}>
                  Cancel editing
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="card card--subtle stack gap-2 p-3" style={{ borderRadius: 'var(--radius-md)' }}>
          <span className="text text--xs text--strong">Sync Options</span>
          <div className="stack gap-1.5">
            <Checkbox
              label="Non-destructive update: refresh details without overwriting user data"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            <Checkbox
              label="Create job inquiries for new contacts"
              checked={createJobs}
              onChange={(e) => setCreateJobs(e.target.checked)}
            />
            {!isConfigured || showOverride ? (
              <Checkbox
                label="Save token to Settings for future 1-click syncs"
                checked={saveToSettings}
                onChange={(e) => setSaveToSettings(e.target.checked)}
              />
            ) : null}
          </div>
        </div>

        {isSyncing ? (
          <div className="stack gap-2.5 card card--subtle p-3" style={{ border: '1px solid var(--color-accent)' }}>
            <div className="flex items-center justify-between">
              <span className="text text--xs text--strong flex items-center gap-2">
                <Spinner /> Synchronizing HubSpot Contacts...
              </span>
              <Badge tone="accent">Step {currentStep + 1} of {STEPS.length}</Badge>
            </div>

            <div className="stack gap-1">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text text--xs flex-nowrap">
                  {idx < currentStep ? (
                    <Check size={13} className="text--success shrink-0" />
                  ) : idx === currentStep ? (
                    <RefreshCw size={13} className="text--accent spin shrink-0" />
                  ) : (
                    <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--color-border)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span className={idx === currentStep ? 'text--strong' : idx > currentStep ? 'text--muted' : ''}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <details className="stack gap-1 pt-1" style={{ cursor: 'pointer' }}>
              <summary className="text text--xs text--muted select-none">
                View technical logs ({logs.length} entries)
              </summary>
              <div
                style={{
                  maxHeight: 90,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: 'var(--color-surface)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginTop: 'var(--space-1)',
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </details>
          </div>
        ) : null}
      </div>

      {/* Lower Right Fixed Footer */}
      <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
        <span className="text text--xs text--muted truncate">
          {isConfigured && !showOverride ? 'Using saved token from Settings' : 'Token stored encrypted'}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSyncing}
            disabled={!isConfigured && !token}
            onClick={handleImport}
          >
            <Globe size={14} className="shrink-0" aria-hidden />{' '}
            {isConfigured && !showOverride ? 'Run HubSpot Sync' : 'Fetch & Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 4. Zapier Webhook Tab */
function ZapierImportTab({ onClose }: { onClose: () => void }) {
  const zapierQuery = useIntegration('ZAPIER')
  const config = (zapierQuery.data?.config as Record<string, string> | null) ?? {}
  const token = config.webhookToken || 'demo_token'
  const webhookUrl = `${window.location.origin}/api/integrations/zapier/webhook?token=${token}`

  const [copied, setCopied] = useState(false)
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        name: 'Samantha Brooks',
        email: 'sbrooks@highlandpeaks.org',
        phone: '(303) 555-0922',
        address: '1540 Boulder Creek Rd',
        service: 'Tile Roof Inspection',
        notes: 'Facebook Lead Ad Campaign',
      },
      null,
      2,
    ),
  )
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<{ status: string; received: boolean; contactId: string | null } | null>(null)

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Zapier Webhook URL copied')
  }

  async function handleSendTestZap() {
    setSimulating(true)
    setSimResult(null)
    try {
      const parsed = JSON.parse(testPayload)
      const res = await fetch(`/api/integrations/zapier/webhook?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const body = await res.json()
      setSimResult(body.data)
      toast.success(`Zapier payload ingested: ${body.data?.status}`)
    } catch (err) {
      toast.error(err)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-3">
      <TabHeader
        icon={<Zap size={16} className="shrink-0 text--accent" />}
        name="Zapier"
        category="Inbound Webhook"
        subtitle="Receive leads in real time from Facebook Ads, Calendly, and forms."
        statusBadge={<Badge tone="success"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 6, flexShrink: 0 }} />Active</Badge>}
      />

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 stack gap-3.5">
        <div className="stack gap-1.5">
          <label className="text text--xs text--strong">Your Inbound Zapier Webhook URL</label>
          <div className="flex items-center gap-2 flex-nowrap">
            <Input readOnly value={webhookUrl} style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }} />
            <Button variant="ghost" onClick={copyUrl} className="shrink-0">
              {copied ? (
                <Check size={14} className="shrink-0 text--success" />
              ) : (
                <Copy size={14} className="shrink-0" />
              )}
              <span className="whitespace-nowrap">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
          <span className="text text--xs text--muted">
            Send a POST request with name, email, phone, and optional service inquiry.
          </span>
        </div>

        <div className="card card--subtle stack gap-2 p-3" style={{ borderRadius: 'var(--radius-md)' }}>
          <div className="flex items-center justify-between">
            <span className="text text--xs text--strong flex items-center gap-1.5">
              <Zap size={13} className="text--accent shrink-0" /> Live Webhook Simulator
            </span>
            <Button variant="ghost" size="sm" loading={simulating} onClick={handleSendTestZap} className="shrink-0">
              <Zap size={13} className="shrink-0" /> Simulate Post
            </Button>
          </div>
          <Textarea
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: '11px' }}
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
          />

          {simResult ? (
            <Notice>
              <div className="stack gap-0.5 text text--xs">
                <span className="text--strong">Status: {simResult.status}</span>
                <span className="text--muted">
                  {simResult.status === 'NEW_CONTACT'
                    ? 'Created a new contact card.'
                    : simResult.status === 'UPDATED_EXISTING'
                      ? 'Matched existing contact and updated details.'
                      : simResult.status === 'LINKED_EXISTING'
                        ? 'Linked directly to existing contact.'
                        : 'Ambiguous match sent to Review Queue.'}
                </span>
              </div>
            </Notice>
          ) : null}
        </div>
      </div>

      {/* Lower Right Fixed Footer */}
      <div className="flex items-center justify-between gap-3 shrink-0 pt-3 border-t border-border mt-auto">
        <span className="text text--xs text--muted truncate">Replay-protected and authenticated</span>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
