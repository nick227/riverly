import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CountRow } from '@project/sdk'
import { useActivityReport, usePipelineReport } from '@project/sdk'
import { Select } from '@/components/primitives/Controls'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { money } from '@/lib/format'

/** Basic pipeline and outreach reports, counted by stable stage/option IDs. */
export function ReportsSettings() {
  const [days, setDays] = useState(90)
  // Stable per selection: a fresh timestamp each render would change the query key and refetch forever.
  const range = useMemo(() => ({ from: new Date(Date.now() - days * 86_400_000).toISOString() }), [days])
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
