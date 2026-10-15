import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import type { CountRow, OpportunitySummary } from '@project/sdk'
import { useActivityReport, useManageOverview, usePipelineReport, useUpdateOpportunity } from '@project/sdk'
import { Select } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateTime, daysSince, money, relative } from '@/lib/format'
import { useSession } from '@/lib/session'
import { MemberSelect } from '../components/MemberSelect'
import { useWorkflowView, type WorkflowView } from '../config/workflow'

/** Manager surface: assignments, neglected leads, inspections, workload and basic reports. */
export default function ManageView() {
  const tab = ({ isActive }: { isActive: boolean }) => cx('segmented__item', isActive && 'is-active')
  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">Manage</h1>
          <p className="text text--muted">Find neglected leads, balance the team, and see how the pipeline is moving.</p>
        </div>
        <nav className="segmented" aria-label="Manage sections">
          <NavLink end to="/manage" className={tab}>
            Overview
          </NavLink>
          <NavLink to="/manage/reports" className={tab}>
            Reports
          </NavLink>
        </nav>
      </div>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="reports" element={<Reports />} />
      </Routes>
    </main>
  )
}

function Overview() {
  const [staleDays, setStaleDays] = useState(7)
  const q = useManageOverview(staleDays)
  const { view } = useWorkflowView()
  const { org } = useSession()
  if (q.isLoading || !view) return <SkeletonList rows={4} height={120} />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  const d = q.data
  return (
    <div className="stack gap-6">
      <div className="grid grid--4 gap-4">
        <Card variant="compact"><Stat value={d.openJobs} label={`Active ${view.terms.opportunity.toLowerCase()}s`} /></Card>
        <Card variant="compact"><Stat value={d.unassignedLeads.length} label="Unassigned" /></Card>
        <Card variant="compact"><Stat value={d.noOutreachYet.length} label={`No outreach in ${view.active[0]?.label}`} /></Card>
        <Card variant="compact"><Stat value={d.overdueFollowUps.length} label="Follow-ups overdue" /></Card>
      </div>

      <div className="grid grid--2 gap-6">
        <JobList title="Unassigned leads" jobs={d.unassignedLeads} view={view} assign empty="Every lead has an owner." />
        <JobList title="No outreach yet" jobs={d.noOutreachYet} view={view} empty="Every new lead has been contacted." detail={(j) => `Received ${relative(j.leadReceivedAt)}`} />
        <JobList title="Overdue follow-ups" jobs={d.overdueFollowUps} view={view} empty="No overdue follow-ups." detail={(j) => `Due ${relative(j.nextFollowUpAt)}`} />
        <JobList
          title={
            <span className="row gap-2">
              No activity in
              <Select size_="sm" aria-label="Days without activity" value={String(staleDays)} onChange={(e) => setStaleDays(Number(e.target.value))} options={[3, 7, 14, 30].map((n) => ({ value: String(n), label: `${n} days` }))} style={{ width: 100 }} />
            </span>
          }
          jobs={d.staleJobs}
          view={view}
          empty="Nothing has gone quiet."
          detail={(j) => `Last activity ${relative(j.lastActivityAt)}`}
        />
      </div>

      <Card>
        <CardHeader title="Upcoming appointments" />
        {d.upcomingAppointments.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>When</th><th>Contact</th><th>Job</th><th>Who</th></tr>
              </thead>
              <tbody>
                {d.upcomingAppointments.map((a) => (
                  <tr key={a.id}>
                    <td className="text--tabular">{dateTime(a.startsAt, org?.timezone)}</td>
                    <td><Link className="link" to={`/jobs/${a.opportunityId}?stage=${a.stageId}`}>{a.contactName}</Link></td>
                    <td>{a.jobTitle}</td>
                    <td>{a.externalPerson?.displayName ?? a.assignee?.displayName ?? <span className="text--muted">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact title="Nothing scheduled in the next two weeks." />
        )}
      </Card>

      <Card>
        <CardHeader title="Team workload" />
        <div className="table-wrap">
          <table className="table table--numeric">
            <thead>
              <tr><th>Person</th><th>Active</th><th>Overdue follow-ups</th><th>Quiet {staleDays}d+</th><th>Attempts (7d)</th></tr>
            </thead>
            <tbody>
              {d.workload.map((w) => (
                <tr key={w.owner.id}>
                  <td><Link className="link" to={`/contacts?owner=${w.owner.id}`}>{w.owner.displayName}</Link></td>
                  <td>{w.openJobs}</td>
                  <td>{w.overdueFollowUps ? <Badge tone="warning">{w.overdueFollowUps}</Badge> : 0}</td>
                  <td>{w.staleJobs}</td>
                  <td>{w.attempts7d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function JobList({ title, jobs, view, empty, assign, detail }: { title: React.ReactNode; jobs: OpportunitySummary[]; view: WorkflowView; empty: string; assign?: boolean; detail?: (j: OpportunitySummary) => string }) {
  return (
    <Card>
      <CardHeader title={title} actions={<Badge tone="outline">{jobs.length}</Badge>} />
      {jobs.length ? (
        <div className="list">
          {jobs.map((j) => (
            <div key={j.id} className="list__row">
              <Link to={`/jobs/${j.id}`} className="stack gap-1 grow" style={{ minWidth: 0 }}>
                <span className="text text--sm text--medium text--truncate">{j.contactName} · {j.title}</span>
                <span className="text text--xs text--muted">{view.stageLabel(j.stageId)} · {detail ? detail(j) : `${daysSince(j.stageEnteredAt)}d in stage`}</span>
              </Link>
              {assign ? <AssignInline job={j} /> : <span className="text text--xs text--muted">{j.owner?.displayName ?? 'Unassigned'}</span>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState compact title={empty} />
      )}
    </Card>
  )
}

function AssignInline({ job }: { job: OpportunitySummary }) {
  const update = useUpdateOpportunity(job.id)
  return (
    <div style={{ width: 170 }}>
      <MemberSelect
        value={job.owner?.id ?? null}
        placeholder="Assign…"
        onChange={(ownerId) => update.mutate({ ownerId }, { onSuccess: () => toast.success(`${job.contactName} assigned`), onError: (e) => toast.error(e) })}
      />
    </div>
  )
}

function Reports() {
  const [days, setDays] = useState(90)
  const range = { from: new Date(Date.now() - days * 86_400_000).toISOString() }
  const pipeline = usePipelineReport(range)
  const activity = useActivityReport(range)
  if (pipeline.isLoading || activity.isLoading) return <SkeletonList rows={4} height={140} />
  if (pipeline.error || !pipeline.data) return <ErrorState error={pipeline.error} />
  if (activity.error || !activity.data) return <ErrorState error={activity.error} />
  const p = pipeline.data
  const a = activity.data
  const fmtMin = (m: number | null) => (m === null ? '—' : m < 120 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`)
  return (
    <div className="stack gap-6">
      <div className="row row--between row--wrap gap-3">
        <span className="text text--sm text--muted">Counts use stable stage and option IDs — renaming labels never rewrites history.</span>
        <Select aria-label="Window" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} options={[30, 90, 180, 365].map((n) => ({ value: String(n), label: `Last ${n} days` }))} style={{ width: 160 }} />
      </div>

      <div className="grid grid--2 gap-6">
        <Card>
          <CardHeader title="Active jobs by stage" />
          <Bars rows={p.byStage} link={(r) => `/contacts?stage=${r.key}`} extra={(r) => `${r.avgDays ?? 0}d avg`} />
          <Definition text={p.definitions.byStage} />
        </Card>
        <Card>
          <CardHeader title="Leads that reached each stage" />
          <Bars rows={p.reachedStage} />
          <Definition text={p.definitions.reachedStage} />
        </Card>
        <Card>
          <CardHeader title="Lead sources" />
          <Bars rows={p.bySource} extra={(r) => (r.valueCents ? `${money(r.valueCents)} contracted` : '')} />
          <Definition text={p.definitions.bySource} />
        </Card>
        <Card>
          <CardHeader title="Active jobs by owner" />
          <Bars rows={p.byOwner} link={(r) => `/contacts?owner=${r.key ?? 'none'}`} />
          <Definition text={p.definitions.byOwner} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Speed to first outreach" />
        <div className="grid grid--4 gap-4">
          <Stat value={a.firstOutreach.leads} label="Leads in window" />
          <Stat value={a.firstOutreach.reached} label="With any outreach" />
          <Stat value={fmtMin(a.firstOutreach.medianMinutesAny)} label="Median to first attempt (any)" />
          <Stat value={fmtMin(a.firstOutreach.medianMinutesVerified)} label={`Median to verified email (n=${a.firstOutreach.verifiedSample})`} />
        </div>
        <Definition text={a.definitions.firstOutreach} />
      </Card>

      <div className="grid grid--3 gap-6">
        <Card>
          <CardHeader title="Contact attempts by outcome" />
          <Bars rows={a.contactAttempts.byOutcome} />
        </Card>
        <Card>
          <CardHeader title="By method" />
          <Bars rows={a.contactAttempts.byMethod} />
        </Card>
        <Card>
          <CardHeader title="By person" />
          <Bars rows={a.contactAttempts.byActor} />
        </Card>
      </div>
      <Notice>{a.definitions.contactAttempts}</Notice>

      <div className="grid grid--2 gap-6">
        <Card>
          <CardHeader title="Value (manually entered)" />
          <div className="grid grid--3 gap-4">
            <Stat value={money(p.valueSummary.estimatedOpenCents) ?? '$0'} label="Estimated, active jobs" />
            <Stat value={money(p.valueSummary.contractedCents) ?? '$0'} label="Contract value" />
            <Stat value={p.valueSummary.contractedJobs} label="Jobs with a contract value" />
          </div>
          <Definition text={p.definitions.valueSummary} />
        </Card>
        <Card>
          <CardHeader title="Data completeness" />
          <div className="grid grid--3 gap-4">
            <Stat value={p.dataQuality.missingSource} label="No lead source" />
            <Stat value={p.dataQuality.missingOwner} label="No owner" />
            <Stat value={p.dataQuality.missingFollowUp} label="No follow-up date" />
          </div>
          <Definition text="Missing values are shown as unknown — reports never assume they are complete." />
        </Card>
      </div>
    </div>
  )
}

function Bars({ rows, link, extra }: { rows: CountRow[]; link?: (r: CountRow) => string; extra?: (r: CountRow) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (!rows.length) return <EmptyState compact title="No data in this window" />
  return (
    <div className="stack gap-3">
      {rows.map((r) => (
        <div key={`${r.key}-${r.label}`} className="stack gap-1">
          <div className="row row--between gap-2">
            {link ? <Link className="text text--sm link" to={link(r)}>{r.label}</Link> : <span className="text text--sm">{r.label}</span>}
            <span className="text text--sm text--tabular">
              {r.count}
              {extra?.(r) ? <span className="text--muted"> · {extra(r)}</span> : null}
            </span>
          </div>
          <div className="meter" role="img" aria-label={`${r.label}: ${r.count}`}>
            <div className="meter__fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const Definition = ({ text }: { text?: string }) => (text ? <p className="text text--xs text--muted mt-4">{text}</p> : null)
