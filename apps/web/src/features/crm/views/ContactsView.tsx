import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Upload } from 'lucide-react'
import type { ContactMatch, OpportunitySummary } from '@project/sdk'
import { useCreateContact, useMatchContacts, useOpportunities } from '@project/sdk'
import { Button, ButtonLink, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Avatar } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { dateTime, fromLocalInput, relative } from '@/lib/format'
import { useSession } from '@/lib/session'
import { useDebounce } from '@/lib/useDebounce'
import { ImportDialog } from '../components/ImportDialog'
import { OwnerSelect, StatusSelect } from '../components/JobRowControls'
import { MemberSelect } from '../components/MemberSelect'
import { PipelineBar } from '../components/PipelineBar'
import { useWorkflowView, type WorkflowView } from '../config/workflow'

type Sort = 'recent' | 'oldest' | 'stale'
type Attention = 'no_outreach' | 'overdue' | 'upcoming' | 'quiet'
const ATTENTION: { value: Attention; label: string; empty: string }[] = [
  { value: 'no_outreach', label: 'No outreach yet', empty: 'Every new lead has been contacted.' },
  { value: 'overdue', label: 'Overdue follow-ups', empty: 'No overdue follow-ups.' },
  { value: 'upcoming', label: 'Upcoming appointments', empty: 'Nothing scheduled in the next two weeks.' },
  { value: 'quiet', label: 'Quiet for 7+ days', empty: 'Nothing has gone quiet.' },
]
const SORTS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'stale', label: 'Least active' },
]

/** Contacts: the company pipeline as one tight, sortable list. */
export default function ContactsView() {
  const [params, setParams] = useSearchParams()
  const { view } = useWorkflowView()
  const { can } = useSession()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [q, setQ] = useState(params.get('q') ?? '')
  const debounced = useDebounce(q.trim(), 250)
  const stageId = params.get('stage') ?? ''
  const owner = params.get('owner') ?? ''
  const status = params.get('status') ?? 'ACTIVE'
  const sort = (params.get('sort') as Sort) || 'recent'
  const attention = (params.get('attention') as Attention) || ''

  useEffect(() => setQ(params.get('q') ?? ''), [params])
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const jobs = useOpportunities({
    q: debounced || undefined,
    stageId: stageId || undefined,
    ownerId: owner || undefined,
    status: status as never,
    sort,
    attention: attention || undefined,
    limit: 25,
  })
  const counts = jobs.data?.pages[0]?.meta.stageCounts ?? {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const list = jobs.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">Contacts</h1>
        </div>
        <div className="action-bar">
          {can('imports.run') ? (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload aria-hidden /> Import
            </Button>
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
          <Select aria-label="Needs attention" value={attention} onChange={(e) => set('attention', e.target.value)} options={ATTENTION.map(({ value, label }) => ({ value, label }))} placeholder="Needs attention" style={{ width: 210 }} />
          <div className="grow" />
          <Segmented<Sort> label="Sort by" value={sort} onChange={(v) => set('sort', v === 'recent' ? '' : v)} options={SORTS} />
        </div>

        {view ? (
          <Segmented
            label="Stage"
            value={stageId}
            onChange={(v) => set('stage', v)}
            options={[{ value: '', label: 'All', count: total }, ...view.active.map((s) => ({ value: s.id, label: s.label, count: counts[s.id] ?? 0 }))]}
          />
        ) : null}

        {jobs.isLoading || !view ? (
          <SkeletonList rows={6} height={60} />
        ) : jobs.error ? (
          <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
        ) : list.length === 0 ? (
          <Card>
            <EmptyState
              title={debounced ? 'No jobs match that search' : attention ? ATTENTION.find((a) => a.value === attention)!.empty : 'No jobs here yet'}
              action={
                <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                  Add contact
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="crm-job-list">
            <div className="crm-job-row crm-job-row--head" aria-hidden>
              <span>Contact</span>
              <span>Stage</span>
              <span>Assigned to</span>
              <span>Reference</span>
              <span>Created</span>
              <span>Status</span>
            </div>
            {list.map((j) => (
              <JobRow key={j.id} job={j} view={view} />
            ))}
          </div>
        )}
        {jobs.hasNextPage ? (
          <Button variant="ghost" loading={jobs.isFetchingNextPage} onClick={() => void jobs.fetchNextPage()} style={{ alignSelf: 'center' }}>
            Load more
          </Button>
        ) : null}
      </div>
      {adding && view ? <NewContactOverlay view={view} onClose={() => setAdding(false)} /> : null}
      {importing ? <ImportDialog onClose={() => setImporting(false)} /> : null}
    </main>
  )
}

/**
 * One job per row, aligned to the column header: who + what, the segment pipeline, then
 * owner and status (both editable in place), lead reference and created time. The name is
 * the link and stretches over the row, so the dropdowns stay usable without navigating.
 */
function JobRow({ job, view }: { job: OpportunitySummary; view: WorkflowView }) {
  const overdue = job.nextFollowUpAt && new Date(job.nextFollowUpAt).getTime() < Date.now()
  const source = view.bindingOptionLabel('opportunity.leadSourceOptionId', job.leadSourceOptionId)
  return (
    <div className="crm-job-row">
      <span className="crm-job-row__who">
        <Avatar name={job.contactName} size="sm" />
        <Link to={`/jobs/${job.id}`} className="crm-job-row__text crm-job-row__link">
          <span className="crm-job-row__name">
            {job.contactName}
            {overdue ? <Badge tone="warning">Follow-up due</Badge> : null}
          </span>
          <span className="crm-job-row__detail">{job.title}</span>
        </Link>
      </span>
      <PipelineBar stages={view.active} currentStageId={job.stageId} compact label={`${job.contactName} pipeline`} />
      <span className="crm-job-row__cell crm-job-row__control" data-label="Assigned to">
        <OwnerSelect job={job} />
      </span>
      <span className="crm-job-row__cell text--muted" data-label="Reference">
        <span className="text--truncate">{source ?? ''}</span>
      </span>
      <span className="crm-job-row__cell text--muted" data-label="Created" title={dateTime(job.leadReceivedAt) ?? undefined}>
        {relative(job.leadReceivedAt)}
      </span>
      <span className="crm-job-row__cell crm-job-row__control crm-job-row__status">
        <StatusSelect job={job} />
      </span>
    </div>
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
