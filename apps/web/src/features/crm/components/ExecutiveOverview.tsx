import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useActivityReport, usePipelineReport, type CompanyHome } from '@project/sdk'
import { Select } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Stat } from '@/components/patterns/Stat'
import { Skeleton } from '@/components/patterns/States'
import { money } from '@/lib/format'
import type { WorkflowView } from '../config/workflow'

const STEP_HINT: Record<string, string> = {
  lead: 'Not called yet',
  called: 'Spoken to',
  inspection: 'Visit and price',
  contract: 'Signed',
  started: 'Crew on site',
  completed: 'Finished',
}

export function ExecutiveOverview({
  companyHome,
  name,
  view,
}: {
  companyHome?: CompanyHome | null
  name?: string
  view?: WorkflowView | null
}) {
  const [days, setDays] = useState(90)
  const range = useMemo(() => ({ from: new Date(Date.now() - days * 86_400_000).toISOString() }), [days])
  const pipeline = usePipelineReport(range)
  const activity = useActivityReport(range)

  const fmtMin = (m: number | null) => (m === null ? '—' : m < 120 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`)

  const p = pipeline.data
  const a = activity.data

  const totalActiveJobs = p ? p.byStage.reduce((acc, r) => acc + r.count, 0) : 0
  const contractedJobs = p?.valueSummary.contractedJobs ?? 0
  const contractedCents = p?.valueSummary.contractedCents ?? 0
  const estimatedOpenCents = p?.valueSummary.estimatedOpenCents ?? 0
  const avgContractSize = contractedJobs > 0 && contractedCents ? money(Math.round(contractedCents / contractedJobs)) : '—'

  const leadsInWindow = a?.firstOutreach.leads ?? 0
  const leadsReached = a?.firstOutreach.reached ?? 0
  const outreachPct = leadsInWindow > 0 ? Math.round((leadsReached / leadsInWindow) * 100) : 0
  const medianAny = a ? fmtMin(a.firstOutreach.medianMinutesAny) : '—'
  const medianVerified = a ? fmtMin(a.firstOutreach.medianMinutesVerified) : '—'

  const totalAttempts = a ? a.contactAttempts.byOutcome.reduce((acc, r) => acc + r.count, 0) : 0
  const inspectionsBooked = a?.inspectionsBooked ?? 0
  const totalMissingFields = p ? p.dataQuality.missingSource + p.dataQuality.missingOwner + p.dataQuality.missingFollowUp : 0

  const avgDwellDays =
    p && totalActiveJobs > 0
      ? Math.round(p.byStage.reduce((sum, r) => sum + (r.avgDays ?? 0) * r.count, 0) / Math.max(1, totalActiveJobs))
      : 0

  const counts = companyHome ? new Map(companyHome.stages.map((s) => [s.stageId, s.count])) : null
  const activeJobsFromHome = companyHome ? companyHome.stages.reduce((sum, s) => sum + s.count, 0) : totalActiveJobs
  const c = companyHome?.company
  const since = companyHome ? new Date(companyHome.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null

  const isLoading = pipeline.isLoading || activity.isLoading

  return (
    <section className="crm-home__section" aria-label="Overview">
      <div className="row row--between row--wrap gap-3 pb-2 border-b">
        <div className="row row--align-center gap-2">
          <h2 className="crm-home__heading" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            Overview
          </h2>
          <Badge tone="neutral">Last {days} days</Badge>
        </div>

        <div className="row row--align-center gap-3">
          <Link to="/settings/reports" className="text text--sm link row row--align-center gap-1">
            <span>Detailed reports</span>
            <ArrowUpRight size={14} aria-hidden />
          </Link>
          <Select
            aria-label="Overview window"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[30, 90, 180, 365].map((n) => ({ value: String(n), label: `Last ${n} days` }))}
            style={{ width: 140 }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="reports-kpi-summary">
          <div className="reports-kpi-card"><Skeleton height={140} /></div>
          <div className="reports-kpi-card"><Skeleton height={140} /></div>
          <div className="reports-kpi-card"><Skeleton height={140} /></div>
        </div>
      ) : (
        <div className="reports-kpi-summary">
          {/* Card 1: Revenue & Pipeline Health */}
          <div className="reports-kpi-card">
            <div className="reports-kpi-card__header">
              <span className="reports-kpi-card__title">Revenue &amp; Pipeline Value</span>
              <Badge tone="success">Financial</Badge>
            </div>
            <div className="reports-kpi-card__grid">
              <Stat
                value={money(contractedCents) ?? '$0'}
                label="Contracted Revenue"
                hint={`${contractedJobs} won/contracted jobs`}
              />
              <Stat
                value={money(estimatedOpenCents) ?? '$0'}
                label="Active Pipeline (Est.)"
                hint={`Across ${totalActiveJobs} active jobs`}
              />
              <Stat
                value={avgContractSize}
                label="Avg Contract Size"
                hint="Realized per signed contract"
              />
              <Stat
                value={totalActiveJobs}
                label="Active Pipeline Jobs"
                hint="Currently in progress"
              />
            </div>
          </div>

          {/* Card 2: Speed-to-Lead & First Outreach */}
          <div className="reports-kpi-card">
            <div className="reports-kpi-card__header">
              <span className="reports-kpi-card__title">Speed-to-Lead &amp; Velocity</span>
              <Badge tone="accent">First Touch</Badge>
            </div>
            <div className="reports-kpi-card__grid">
              <Stat
                value={medianAny}
                label="Median First Touch"
                hint="Phone or email attempt"
              />
              <Stat
                value={medianVerified}
                label="Verified Email Speed"
                hint={a ? `n=${a.firstOutreach.verifiedSample} verified deliveries` : undefined}
              />
              <Stat
                value={`${outreachPct}%`}
                label="First Outreach Rate"
                hint={`${leadsReached} of ${leadsInWindow} leads contacted`}
              />
              <Stat
                value={leadsInWindow}
                label="Inbound Leads"
                hint="Total inquiries in window"
              />
            </div>
          </div>

          {/* Card 3: Field Operations & Pipeline Discipline */}
          <div className="reports-kpi-card">
            <div className="reports-kpi-card__header">
              <span className="reports-kpi-card__title">Operations &amp; Field Health</span>
              <Badge tone="warning">Discipline</Badge>
            </div>
            <div className="reports-kpi-card__grid">
              <Stat
                value={inspectionsBooked}
                label="Inspections Booked"
                hint="On-site field visits scheduled"
              />
              <Stat
                value={totalAttempts}
                label="Total Contact Attempts"
                hint="Calls, voicemails, emails"
              />
              <Stat
                value={`${avgDwellDays}d`}
                label="Avg Days in Stage"
                hint="Active pipeline dwell time"
              />
              <Stat
                value={totalMissingFields}
                label="Hygiene Flags"
                hint={p ? `${p.dataQuality.missingOwner} unassigned · ${p.dataQuality.missingFollowUp} no follow-up` : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stages Breakdown (Workflow Stepper Table) */}
      {view && counts && (
        <div className="stack gap-3 pt-2">
          {c && since && name && (
            <p className="crm-home__text">
              {name} has <strong>{activeJobsFromHome} active jobs</strong> in flight. Since {since}, the team has made{' '}
              {c.calls.toLocaleString()} calls, signed{' '}
              <strong>
                {c.sales} {c.sales === 1 ? 'contract' : 'contracts'} worth {money(c.salesValueCents) ?? '$0'}
              </strong>{' '}
              and completed {c.completed} {c.completed === 1 ? 'job' : 'jobs'}.
            </p>
          )}
          <ol className="crm-home__steps">
            {view.active.map((s) => (
              <li key={s.id}>
                <Link to={`/contacts?stage=${s.id}`} className="crm-home__step">
                  <span className="crm-home__step-count">{counts.get(s.id) ?? 0}</span>
                  <span className="crm-home__step-name">{s.label}</span>
                  {STEP_HINT[s.id] ? <span className="crm-home__step-hint">{STEP_HINT[s.id]}</span> : null}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
