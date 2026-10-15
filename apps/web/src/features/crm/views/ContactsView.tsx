import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Upload } from 'lucide-react'
import type { ContactMatch, OpportunitySummary } from '@project/sdk'
import { useContacts, useCreateContact, useMatchContacts, useOpportunities, useReviewQueue, useSources } from '@project/sdk'
import { Button, ButtonLink, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Avatar, Identity } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { daysSince, fromLocalInput, money, relative } from '@/lib/format'
import { useSession } from '@/lib/session'
import { useDebounce } from '@/lib/useDebounce'
import { MemberSelect } from '../components/MemberSelect'
import { PipelineBar } from '../components/PipelineBar'
import { statusLabel, statusTone } from '../config/labels'
import { useWorkflowView, type WorkflowView } from '../config/workflow'

type Layout = 'list' | 'board' | 'directory'

/** Contacts combines the pipeline, lead intake and the contact directory over the same records. */
export default function ContactsView() {
  const [params, setParams] = useSearchParams()
  const { view } = useWorkflowView()
  const { can } = useSession()
  const review = useReviewQueue()
  const sources = useSources()
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState(params.get('q') ?? '')
  const debounced = useDebounce(q.trim(), 250)
  const layout = (params.get('layout') as Layout) ?? 'list'
  const stageId = params.get('stage') ?? ''
  const owner = params.get('owner') ?? ''
  const status = params.get('status') ?? 'ACTIVE'
  const sourceId = params.get('source') ?? ''

  useEffect(() => setQ(params.get('q') ?? ''), [params])
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const jobs = useOpportunities({
    q: debounced || undefined,
    stageId: layout === 'list' ? stageId || undefined : undefined,
    ownerId: owner || undefined,
    status: status as never,
    limit: layout === 'board' ? 100 : 25,
  })
  const counts = jobs.data?.pages[0]?.meta.stageCounts ?? {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const list = jobs.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">Contacts</h1>
          <p className="text text--muted">Every lead, where it sits in the pipeline, and who owns it.</p>
        </div>
        <div className="action-bar">
          {review.data?.length ? (
            <ButtonLink to="/contacts/review" variant="secondary">
              Review matches <Badge tone="warning">{review.data.length}</Badge>
            </ButtonLink>
          ) : null}
          {can('imports.run') ? (
            <ButtonLink to="/contacts/import" variant="secondary">
              <Upload aria-hidden /> Import CSV
            </ButtonLink>
          ) : null}
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add contact
          </Button>
        </div>
      </div>

      <div className="stack gap-4">
        <div className="row row--wrap gap-3">
          <div className="crm-header__search" style={{ marginLeft: 0, maxWidth: 360 }}>
            <Search aria-hidden />
            <Input type="search" aria-label="Search contacts" placeholder="Search name, email, phone, address" value={q} onChange={(e) => (setQ(e.target.value), set('q', e.target.value.trim()))} />
          </div>
          {layout !== 'directory' ? (
            <>
              <Select aria-label="Owner" value={owner} onChange={(e) => set('owner', e.target.value)} options={[{ value: 'me', label: 'Mine' }, { value: 'none', label: 'Unassigned' }]} placeholder="Everyone" style={{ width: 150 }} />
              <Select
                aria-label="Status"
                value={status}
                onChange={(e) => set('status', e.target.value === 'ACTIVE' ? '' : e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'ON_HOLD', label: 'On hold' },
                  { value: 'LOST', label: 'Lost' },
                  { value: 'ALL', label: 'All statuses' },
                ]}
                style={{ width: 150 }}
              />
            </>
          ) : (
            <Select aria-label="Source" value={sourceId} onChange={(e) => set('source', e.target.value)} placeholder="All sources" options={(sources.data ?? []).map((s) => ({ value: s.id, label: `${s.displayName} (${s.contactCount})` }))} style={{ width: 220 }} />
          )}
          <div className="grow" />
          <Segmented<Layout>
            label="Layout"
            value={layout}
            onChange={(v) => set('layout', v === 'list' ? '' : v)}
            options={[
              { value: 'list', label: 'Pipeline' },
              { value: 'board', label: 'Board' },
              { value: 'directory', label: 'Directory' },
            ]}
          />
        </div>

        {layout === 'list' && view ? (
          <Segmented
            label="Stage"
            value={stageId}
            onChange={(v) => set('stage', v)}
            options={[{ value: '', label: 'All', count: total }, ...view.active.map((s) => ({ value: s.id, label: s.label, count: counts[s.id] ?? 0 }))]}
          />
        ) : null}

        {layout === 'directory' ? (
          <Directory q={debounced} sourceId={sourceId} />
        ) : jobs.isLoading || !view ? (
          <SkeletonList rows={5} height={84} />
        ) : jobs.error ? (
          <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
        ) : list.length === 0 ? (
          <Card>
            <EmptyState
              title={debounced ? 'No jobs match that search' : 'No jobs here yet'}
              action={
                <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                  Add contact
                </Button>
              }
            />
          </Card>
        ) : layout === 'board' ? (
          <Board jobs={list} view={view} />
        ) : (
          <div className="stack gap-2">
            {list.map((j) => (
              <JobRow key={j.id} job={j} view={view} />
            ))}
          </div>
        )}
        {layout !== 'directory' && jobs.hasNextPage ? (
          <Button variant="ghost" loading={jobs.isFetchingNextPage} onClick={() => void jobs.fetchNextPage()} style={{ alignSelf: 'center' }}>
            Load more
          </Button>
        ) : null}
      </div>
      {adding && view ? <NewContactOverlay view={view} onClose={() => setAdding(false)} /> : null}
    </main>
  )
}

function JobRow({ job, view }: { job: OpportunitySummary; view: WorkflowView }) {
  const value = job.contractValueCents ?? job.estimatedValueCents
  const overdue = job.nextFollowUpAt && new Date(job.nextFollowUpAt).getTime() < Date.now()
  return (
    <Link to={`/jobs/${job.id}`} className="crm-job-row">
      <Identity name={job.contactName} primary={job.contactName} secondary={`${job.title} · opened ${relative(job.leadReceivedAt)}`} />
      <PipelineBar stages={view.active} currentStageId={job.stageId} compact label={`${job.contactName} pipeline`} />
      <div className="crm-job-row__side">
        <span className="text text--sm text--strong text--tabular">{value !== null ? money(value) : 'No value yet'}</span>
        <span className="text text--xs text--muted">{view.bindingOptionLabel('opportunity.leadSourceOptionId', job.leadSourceOptionId) ?? 'Source not recorded'}</span>
        <span className="row gap-1">
          {job.status !== 'OPEN' ? <Badge tone={statusTone(job.status)}>{statusLabel(job.status)}</Badge> : null}
          {overdue ? <Badge tone="warning">Follow-up due</Badge> : null}
          <span className="text text--xs text--muted">{job.owner?.displayName ?? 'Unassigned'}</span>
        </span>
      </div>
    </Link>
  )
}

function Board({ jobs, view }: { jobs: OpportunitySummary[]; view: WorkflowView }) {
  return (
    <div className="crm-board" style={{ '--stages': view.active.length } as React.CSSProperties}>
      {view.active.map((s) => {
        const inStage = jobs.filter((j) => j.stageId === s.id)
        return (
          <section key={s.id} className="crm-board__column" aria-label={s.label}>
            <div className="crm-board__header">
              <span>{s.label}</span>
              <span className="text text--xs text--muted">{inStage.length}</span>
            </div>
            {inStage.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="card card--compact card--interactive stack gap-2">
                <span className="text text--sm text--strong">{j.contactName}</span>
                <span className="text text--xs text--muted">{j.title}</span>
                <span className="row row--between">
                  <span className="text text--xs text--muted">{daysSince(j.stageEnteredAt)}d in stage</span>
                  {j.owner ? <Avatar name={j.owner.displayName} src={j.owner.avatarUrl} size="sm" /> : <span className="text text--xs text--muted">Unassigned</span>}
                </span>
              </Link>
            ))}
          </section>
        )
      })}
    </div>
  )
}

function Directory({ q, sourceId }: { q: string; sourceId: string }) {
  const contacts = useContacts({ q: q || undefined, sourceId: sourceId || undefined })
  const list = contacts.data?.pages.flatMap((p) => p.data) ?? []
  if (contacts.isLoading) return <SkeletonList rows={5} height={56} />
  if (contacts.error) return <ErrorState error={contacts.error} />
  if (!list.length) return <Card><EmptyState title="No contacts match" /></Card>
  return (
    <Card variant="flush">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Jobs</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/contacts/${c.id}`} className="link">
                    {c.name}
                  </Link>
                </td>
                <td className="text--tabular">{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.opportunities.length}</td>
                <td>
                  <span className="row row--wrap gap-1">
                    {c.sourceNames.map((s) => (
                      <Badge key={s} tone="outline">
                        {s}
                      </Badge>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {contacts.hasNextPage ? (
        <div className="row row--end" style={{ padding: 'var(--space-3)' }}>
          <Button size="sm" variant="ghost" loading={contacts.isFetchingNextPage} onClick={() => void contacts.fetchNextPage()}>
            Load more
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

/** Manual intake. Checks for existing people first and never merges on its own. */
function NewContactOverlay({ view, onClose }: { view: WorkflowView; onClose: () => void }) {
  const { me } = useSession()
  const navigate = useNavigate()
  const create = useCreateContact()
  const match = useMatchContacts()
  const [matches, setMatches] = useState<ContactMatch[]>([])
  const [v, setV] = useState({ name: '', email: '', phone: '', addressLine: '', city: '', region: '', postalCode: '' })
  const [job, setJob] = useState({ title: '', propertyAddress: '', leadSourceOptionId: '', urgencyOptionId: '', inquiry: '', ownerId: me?.id ?? null as string | null, leadReceivedAt: '' })
  const [withJob, setWithJob] = useState(true)
  const leadField = view.fieldFor('opportunity.leadSourceOptionId')
  const urgencyField = view.fieldFor('opportunity.urgencyOptionId')
  const setC = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  const setJ = (k: keyof typeof job) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setJob({ ...job, [k]: e.target.value })

  const checkMatches = () => {
    if (!v.email && !v.phone) return
    match.mutate({ email: v.email || null, phone: v.phone || null, name: v.name || null }, { onSuccess: setMatches })
  }

  function submit() {
    create.mutate(
      {
        ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim() || null])),
        name: v.name.trim(),
        job: withJob
          ? {
              title: job.title.trim() || 'New inquiry',
              propertyAddress: job.propertyAddress.trim() || [v.addressLine, v.city].filter(Boolean).join(', ') || null,
              leadSourceOptionId: job.leadSourceOptionId || null,
              urgencyOptionId: job.urgencyOptionId || null,
              inquiry: job.inquiry.trim() || null,
              ownerId: job.ownerId,
              leadReceivedAt: fromLocalInput(job.leadReceivedAt),
            }
          : undefined,
      },
      {
        onSuccess: (c) => {
          toast.success(`${c.name} added`)
          onClose()
          navigate(c.opportunities[0] ? `/jobs/${c.opportunities[0].id}` : `/contacts/${c.id}`)
        },
        onError: (e) => toast.error(e),
      },
    )
  }

  return (
    <Overlay
      open
      variant="wide"
      onRequestClose={onClose}
      title="Add contact"
      footer={
        <>
          <label className="checkbox">
            <input type="checkbox" checked={withJob} onChange={(e) => setWithJob(e.target.checked)} /> Create a {view.terms.opportunity.toLowerCase()} in {view.active[0]?.label}
          </label>
          <Button variant="primary" onClick={submit} loading={create.isPending} disabled={!v.name.trim()}>
            Add contact
          </Button>
        </>
      }
    >
      <div className="stack gap-6">
        <div className="field-group">
          <Field label="Name">{(id) => <Input id={id} value={v.name} onChange={setC('name')} autoFocus />}</Field>
          <Field label="Phone">{(id) => <Input id={id} type="tel" value={v.phone} onChange={setC('phone')} onBlur={checkMatches} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" value={v.email} onChange={setC('email')} onBlur={checkMatches} />}</Field>
          <Field label="Street">{(id) => <Input id={id} value={v.addressLine} onChange={setC('addressLine')} />}</Field>
          <Field label="City">{(id) => <Input id={id} value={v.city} onChange={setC('city')} />}</Field>
          <div className="grid grid--2 gap-3">
            <Field label="State">{(id) => <Input id={id} value={v.region} onChange={setC('region')} />}</Field>
            <Field label="ZIP">{(id) => <Input id={id} value={v.postalCode} onChange={setC('postalCode')} />}</Field>
          </div>
        </div>

        {matches.length ? (
          <Notice tone="warning">
            <div className="stack gap-2">
              <span>This may be someone you already have. Add a new {view.terms.opportunity.toLowerCase()} to them instead of creating a duplicate?</span>
              {matches.map((m) => (
                <div key={m.contact.id} className="row row--between gap-2">
                  <span className="text text--sm">
                    <strong>{m.contact.name}</strong> — matches {m.matchedOn.join(' & ')}
                  </span>
                  <ButtonLink size="sm" to={`/contacts/${m.contact.id}?addJob=1`} onClick={onClose}>
                    Open {m.contact.name.split(' ')[0]}
                  </ButtonLink>
                </div>
              ))}
            </div>
          </Notice>
        ) : null}

        {withJob ? (
          <div className="field-group">
            <Field label={view.fieldFor('opportunity.title')?.label ?? 'Service'}>{(id) => <Input id={id} value={job.title} onChange={setJ('title')} placeholder="Roof repair, replacement…" />}</Field>
            <Field label={view.fieldFor('opportunity.propertyAddress')?.label ?? 'Property'} hint="Defaults to the contact address">
              {(id) => <Input id={id} value={job.propertyAddress} onChange={setJ('propertyAddress')} />}
            </Field>
            {leadField ? (
              <Field label={leadField.label}>{(id) => <Select id={id} value={job.leadSourceOptionId} onChange={setJ('leadSourceOptionId')} placeholder="Not recorded" options={view.options(leadField.id).map((o) => ({ value: o.id, label: o.label }))} />}</Field>
            ) : null}
            {urgencyField ? (
              <Field label={urgencyField.label}>{(id) => <Select id={id} value={job.urgencyOptionId} onChange={setJ('urgencyOptionId')} placeholder="Not set" options={view.options(urgencyField.id).map((o) => ({ value: o.id, label: o.label }))} />}</Field>
            ) : null}
            <Field label={view.terms.owner}>{(id) => <MemberSelect id={id} value={job.ownerId} onChange={(ownerId) => setJob({ ...job, ownerId })} />}</Field>
            <Field label="Lead received" hint="Leave blank for now">{(id) => <Input id={id} type="datetime-local" value={job.leadReceivedAt} onChange={setJ('leadReceivedAt')} />}</Field>
            <Field label={view.fieldFor('opportunity.inquiry')?.label ?? 'Inquiry'} className="crm-workspace__control--wide">
              {(id) => <Textarea id={id} rows={3} value={job.inquiry} onChange={setJ('inquiry')} />}
            </Field>
          </div>
        ) : null}
      </div>
    </Overlay>
  )
}
