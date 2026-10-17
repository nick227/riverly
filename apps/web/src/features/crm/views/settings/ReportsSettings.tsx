import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CountRow } from '@project/sdk'
import { useActivityReport, useMembers, usePipelineReport } from '@project/sdk'
import { Select } from '@/components/primitives/Controls'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { money } from '@/lib/format'
import { useSession } from '@/lib/session'
import { REPORTS, downloadReport, type ReportDefinition } from './reportCatalog'

/** Downloadable reports plus this period's numbers, all as tables. */
export function ReportsSettings() {
  const [days, setDays] = useState(90)
  const { org } = useSession()

  // Stable per selection: a fresh timestamp each render would change the query key and refetch forever.
  const range = useMemo(() => ({ from: new Date(Date.now() - days * 86_400_000).toISOString() }), [days])
  const pipeline = usePipelineReport(range)
  const activity = useActivityReport(range)
  const members = useMembers()

  const memberSlug = (userId: string | null | undefined) =>
    userId ? members.data?.find((m) => m.userId === userId)?.slug : undefined

  const handleDownload = async (report: ReportDefinition) => {
    try {
      await downloadReport(report, { companyName: org?.name, days })
      toast.success(`Downloaded ${report.title}`)
    } catch {
      toast.error('The download did not start. Try again.')
    }
  }

  if (pipeline.isLoading || activity.isLoading) return <SkeletonList rows={4} height={140} />
  if (pipeline.error || !pipeline.data) return <ErrorState error={pipeline.error} />
  if (activity.error || !activity.data) return <ErrorState error={activity.error} />

  const p = pipeline.data
  const a = activity.data

  return (
    <div className="stack gap-8">
      <div className="row row--between row--wrap gap-3">
        <div className="row row--wrap gap-3">
          <Link to="/" className="text text--sm link">
            Overview on Home →
          </Link>
          <Select
            aria-label="Period"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[30, 90, 180, 365].map((n) => ({ value: String(n), label: `Last ${n} days` }))}
            style={{ width: 160 }}
          />
        </div>
      </div>

      <section className="stack gap-4" aria-labelledby="reports-numbers">

        <div className="stack gap-6">
          <CountTable
            title="Open jobs by step"
            nameHeader="Step"
            countHeader="Jobs"
            rows={p.byStage}
            link={(r) => `/contacts?stage=${r.key}`}
            extraHeader="Avg. days at step"
            extra={(r) => String(r.avgDays ?? 0)}
          />
          <CountTable
            title="How far new leads got"
            nameHeader="Step"
            countHeader="Leads"
            rows={p.reachedStage}
          />
          <CountTable
            title="Lead sources"
            nameHeader="Source"
            countHeader="Leads"
            rows={p.bySource}
            extraHeader="Contract value"
            extra={(r) => (r.valueCents ? money(r.valueCents) ?? '' : '—')}
          />
          <CountTable
            title="Open jobs by person"
            nameHeader="Person"
            countHeader="Jobs"
            rows={p.byOwner}
            link={(r) => {
              const s = memberSlug(r.key)
              return s ? `/u/${s}` : r.key ? `/contacts?owner=${r.key}` : ''
            }}
          />
        </div>

        <div className="stack gap-6">
          <FigureTable
            title="Job value"
            rows={[
              ['Estimated value of open jobs', money(p.valueSummary.estimatedOpenCents) ?? '$0'],
              ['Signed contract value', money(p.valueSummary.contractedCents) ?? '$0'],
              ['Jobs with a contract value', p.valueSummary.contractedJobs],
            ]}
            note="Entered by your team. Not verified and not money collected."
          />
          <FigureTable
            title="Records missing details"
            rows={[
              ['No lead source', p.dataQuality.missingSource],
              ['No owner', p.dataQuality.missingOwner],
              ['No follow-up date', p.dataQuality.missingFollowUp],
            ]}
            note="Fill these in so the numbers above stay accurate."
          />
        </div>
      </section>

      <section className="stack gap-3" aria-labelledby="reports-downloads">
        <div className="stack gap-1">
          <h3 id="reports-downloads" className="heading heading--3">Reports</h3>
        </div>
        <table className="table reports-table">
          <tbody>
            {REPORTS.map((r) => (
              <tr key={r.id} className="reports-table__row">
                <td>
                  <button type="button" className="reports-table__title" onClick={() => handleDownload(r)} title="Download as Excel">
                    {r.title}
                  </button>
                  <p className="reports-table__pitch">{r.pitch}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  )
}

function CountTable({
  title,
  nameHeader,
  countHeader,
  rows,
  link,
  extraHeader,
  extra,
  note,
}: {
  title: string
  nameHeader: string
  countHeader: string
  rows: CountRow[]
  link?: (r: CountRow) => string
  extraHeader?: string
  extra?: (r: CountRow) => string
  note?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="stack gap-2">
      <h4 className="heading heading--5">{title}</h4>
      {rows.length ? (
        <div className="table-wrap">
          <table className="table table--numeric reports-count-table">
            <thead>
              <tr>
                <th scope="col">{nameHeader}</th>
                <th scope="col">{countHeader}</th>
                {extraHeader ? <th scope="col">{extraHeader}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = link?.(r)
                return (
                  <tr key={`${r.key}-${r.label}`}>
                    <td>
                      <div className="stack gap-1">
                        {href ? (
                          <Link className="link" to={href}>
                            {r.label}
                          </Link>
                        ) : (
                          <span>{r.label}</span>
                        )}
                        <div className="meter" aria-hidden>
                          <div className="meter__fill" style={{ width: `${(r.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>{r.count}</td>
                    {extraHeader ? <td>{extra?.(r)}</td> : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState compact title="Nothing in this period" />
      )}
      {note ? <p className="text text--xs text--muted">{note}</p> : null}
    </div>
  )
}

function FigureTable({ title, rows, note }: { title: string; rows: [string, string | number][]; note?: string }) {
  return (
    <div className="stack gap-2">
      <h4 className="heading heading--5">{title}</h4>
      <table className="table table--numeric">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="text text--xs text--muted">{note}</p> : null}
    </div>
  )
}
