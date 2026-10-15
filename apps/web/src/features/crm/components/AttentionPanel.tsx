import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { OpportunitySummary } from '@project/sdk'
import { useManageOverview } from '@project/sdk'
import { Button, Select } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/patterns/States'
import { dateTime, daysSince, relative } from '@/lib/format'
import type { WorkflowView } from '../config/workflow'

const PREVIEW = 5

/** Manager rail beside the company river: upcoming appointments and jobs that need a first touch or a nudge. */
export function AttentionPanel({ view, timezone }: { view: WorkflowView; timezone?: string }) {
  const [staleDays, setStaleDays] = useState(7)
  const q = useManageOverview(staleDays)
  if (q.isLoading) return <SkeletonList rows={4} height={96} />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  const d = q.data
  return (
    <aside className="crm-attention" aria-label="Needs attention">
      <Card variant="compact">
        <CardHeader as="h3" title="Upcoming appointments" actions={<Badge tone="outline">{d.upcomingAppointments.length}</Badge>} />
        {d.upcomingAppointments.length ? (
          <div className="list">
            {d.upcomingAppointments.map((a) => (
              <Link key={a.id} to={`/jobs/${a.opportunityId}?stage=${a.stageId}`} className="list__row list__row--link">
                <span className="stack gap-1 grow" style={{ minWidth: 0 }}>
                  <span className="text text--sm text--medium text--truncate">{a.contactName} · {a.jobTitle}</span>
                  <span className="text text--xs text--muted">
                    {dateTime(a.startsAt, timezone)} · {a.externalPerson?.displayName ?? a.assignee?.displayName ?? 'Unassigned'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState compact title="Nothing scheduled in the next two weeks." />
        )}
      </Card>

      <JobList title="No outreach yet" jobs={d.noOutreachYet} view={view} empty="Every new lead has been contacted." detail={(j) => `Received ${relative(j.leadReceivedAt)}`} />
      <JobList title="Overdue follow-ups" jobs={d.overdueFollowUps} view={view} empty="No overdue follow-ups." detail={(j) => `Due ${relative(j.nextFollowUpAt)}`} />
      <JobList
        title={
          <span className="row gap-2">
            Quiet for
            <Select size_="sm" aria-label="Days without activity" value={String(staleDays)} onChange={(e) => setStaleDays(Number(e.target.value))} options={[3, 7, 14, 30].map((n) => ({ value: String(n), label: `${n} days` }))} style={{ width: 100 }} />
          </span>
        }
        jobs={d.staleJobs}
        view={view}
        empty="Nothing has gone quiet."
        detail={(j) => `Last activity ${relative(j.lastActivityAt)}`}
      />

    </aside>
  )
}

function JobList({ title, jobs, view, empty, detail }: { title: React.ReactNode; jobs: OpportunitySummary[]; view: WorkflowView; empty: string; detail?: (j: OpportunitySummary) => string }) {
  const [all, setAll] = useState(false)
  const shown = all ? jobs : jobs.slice(0, PREVIEW)
  return (
    <Card variant="compact">
      <CardHeader as="h3" title={title} actions={<Badge tone={jobs.length ? 'warning' : 'outline'}>{jobs.length}</Badge>} />
      {jobs.length ? (
        <div className="list">
          {shown.map((j) => (
            <div key={j.id} className="list__row">
              <Link to={`/jobs/${j.id}`} className="stack gap-1 grow" style={{ minWidth: 0 }}>
                <span className="text text--sm text--medium text--truncate">{j.contactName} · {j.title}</span>
                <span className="text text--xs text--muted">{view.stageLabel(j.stageId)} · {detail ? detail(j) : `${daysSince(j.stageEnteredAt)}d in stage`}</span>
              </Link>
              <span className="text text--xs text--muted">{j.owner?.displayName ?? 'Unassigned'}</span>
            </div>
          ))}
          {jobs.length > PREVIEW ? (
            <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show all ${jobs.length}`}
            </Button>
          ) : null}
        </div>
      ) : (
        <EmptyState compact title={empty} />
      )}
    </Card>
  )
}
