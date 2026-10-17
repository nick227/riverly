import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarClock,
  Check,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  GitBranch,
  Hourglass,
  MailCheck,
  PhoneCall,
  Radio,
  Scale,
  Search,
  ShieldCheck,
  Star,
  Timer,
  Users,
  BarChart3,
} from 'lucide-react'
import type { CountRow } from '@project/sdk'
import { useActivityReport, useMembers, usePipelineReport } from '@project/sdk'
import { Select, Input, Button } from '@/components/primitives/Controls'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState, ErrorState, Notice, SkeletonList } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { Badge } from '@/components/patterns/Badge'
import { toast } from '@/components/patterns/Toast'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import {
  CUSTOM_REPORTS,
  REPORT_CATEGORIES,
  downloadReportCsv,
  type CustomReportDefinition,
} from './customReportsCatalog'

/** Basic pipeline, executive KPIs, and custom operational reports. */
export function ReportsSettings() {
  const [days, setDays] = useState(90)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Stable per selection: a fresh timestamp each render would change the query key and refetch forever.
  const range = useMemo(() => ({ from: new Date(Date.now() - days * 86_400_000).toISOString() }), [days])
  const pipeline = usePipelineReport(range)
  const activity = useActivityReport(range)
  const members = useMembers()

  const memberSlug = (userId: string | null | undefined) =>
    userId ? members.data?.find((m) => m.userId === userId)?.slug : undefined

  // Filter custom reports by category and text search
  const filteredReports = useMemo(() => {
    return CUSTOM_REPORTS.filter((report) => {
      const matchesCategory = selectedCategory === 'All' || report.category === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCategory

      const matchesSearch =
        report.title.toLowerCase().includes(query) ||
        report.headline.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query) ||
        report.models.some((m) => m.toLowerCase().includes(query))

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  // Category counts for filter tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: CUSTOM_REPORTS.length }
    for (const report of CUSTOM_REPORTS) {
      counts[report.category] = (counts[report.category] ?? 0) + 1
    }
    return counts
  }, [])

  const handleDownload = (report: CustomReportDefinition) => {
    setDownloadingId(report.id)
    try {
      downloadReportCsv(report, days)
      toast.success(`Export generated: ${report.title} (CSV downloaded)`)
    } catch {
      toast.error('Failed to trigger export download')
    } finally {
      setTimeout(() => {
        setDownloadingId((curr) => (curr === report.id ? null : curr))
      }, 1000)
    }
  }

  if (pipeline.isLoading || activity.isLoading) return <SkeletonList rows={4} height={140} />
  if (pipeline.error || !pipeline.data) return <ErrorState error={pipeline.error} />
  if (activity.error || !activity.data) return <ErrorState error={activity.error} />

  const p = pipeline.data
  const a = activity.data

  return (
    <div className="stack gap-6">
      {/* ── Top Window Selector ── */}
      <div className="row row--between row--wrap gap-3">
        <span className="text text--sm text--muted">
          Counts use stable stage and option IDs — renaming labels never rewrites history.
        </span>
        <div className="row row--align-center gap-3">
          <Link to="/" className="text text--sm link">
            Executive Overview on Home →
          </Link>
          <Select
            aria-label="Window"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[30, 90, 180, 365].map((n) => ({ value: String(n), label: `Last ${n} days` }))}
            style={{ width: 160 }}
          />
        </div>
      </div>

      {/* ── Custom Reports Section (New) ── */}
      <div className="stack gap-4 pt-3">
        <div className="reports-section-header">
          <div className="stack gap-1">
            <div className="reports-section-title-wrap">
              <h2 className="heading heading--3">Custom Reports</h2>
              <Badge tone="accent">{CUSTOM_REPORTS.length} Available</Badge>
            </div>
            <p className="text text--sm text--muted">
              Pre-configured analytical exports compiled directly from Riverly's immutable stage transitions,
              outreach timestamps, and field inspection records.
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="reports-filter-bar">
          <div className="reports-filter-row">
            <div className="reports-search-box">
              <Search aria-hidden />
              <Input
                placeholder="Search reports by title, metric, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size_="sm"
              />
            </div>

            <span className="text text--xs text--muted">
              Showing {filteredReports.length} of {CUSTOM_REPORTS.length} reports
            </span>
          </div>

          <div className="reports-category-pills" role="tablist" aria-label="Report Categories">
            <button
              type="button"
              className={cx('reports-category-pill', selectedCategory === 'All' && 'is-active')}
              onClick={() => setSelectedCategory('All')}
            >
              All ({categoryCounts['All']})
            </button>
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={cx('reports-category-pill', selectedCategory === cat && 'is-active')}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({categoryCounts[cat] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Custom Reports Cards Grid */}
        {filteredReports.length > 0 ? (
          <div className="reports-grid">
            {filteredReports.map((report) => {
              const isDownloading = downloadingId === report.id
              return (
                <div key={report.id} className="report-item-card">
                  <div className="report-item-card__top">
                    <div className="report-item-card__header">
                      <div className="report-item-card__icon" aria-hidden>
                        {getReportIcon(report.id)}
                      </div>
                      <div className="report-item-card__tags">
                        <Badge tone={report.badgeTone}>{report.category}</Badge>
                        <Badge tone="outline">{report.format}</Badge>
                      </div>
                    </div>

                    <h3 className="report-item-card__title">{report.title}</h3>
                    <p className="report-item-card__headline">{report.headline}</p>
                    <p className="report-item-card__desc">{report.description}</p>
                  </div>

                  <div className="report-item-card__footer">
                    <div className="report-item-card__meta">
                      <span className="report-item-card__cadence">{report.cadence} refresh</span>
                      <span className="report-item-card__model" title={`Data models: ${report.models.join(', ')}`}>
                        {report.models.join(' · ')}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(report)}
                      disabled={isDownloading}
                      title={`Export ${report.title} as CSV`}
                    >
                      {isDownloading ? (
                        <>
                          <Check size={14} className="text--success" />
                          <span>Exported</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Download {report.format}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            compact
            title={
              <span className="stack gap-1">
                <span>No matching reports found</span>
                <span className="text text--xs text--muted">
                  No report matches &ldquo;{searchQuery}&rdquo; in category &ldquo;{selectedCategory}&rdquo;.
                </span>
              </span>
            }
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                }}
              >
                Clear Filters
              </Button>
            }
          />
        )}
      </div>

      {/* ── Standard Visual Analytics & Breakdowns (Moved below summary numbers) ── */}
      <div className="stack gap-4 pt-4 border-t">
        <div className="row row--between">
          <div className="row gap-2">
            <h2 className="heading heading--4">Pipeline &amp; Outreach Breakdowns</h2>
            <Badge tone="neutral">Standard Views</Badge>
          </div>
          <span className="text text--xs text--muted">Categorized by stage, owner, source, and outreach method</span>
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
            <Bars
              rows={p.byOwner}
              link={(r) => {
                const s = memberSlug(r.key)
                return s ? `/u/${s}` : r.key ? `/contacts?owner=${r.key}` : ''
              }}
            />
            <Definition text={p.definitions.byOwner} />
          </Card>
        </div>

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
            <Bars
              rows={a.contactAttempts.byActor}
              link={(r) => {
                const s = memberSlug(r.key)
                return s ? `/u/${s}` : ''
              }}
            />
          </Card>
        </div>
        <Notice>{a.definitions.contactAttempts}</Notice>

        <div className="grid grid--2 gap-6">
          <Card>
            <CardHeader title="Value breakdown (manually entered)" />
            <div className="grid grid--3 gap-4">
              <Stat value={money(p.valueSummary.estimatedOpenCents) ?? '$0'} label="Estimated, active jobs" />
              <Stat value={money(p.valueSummary.contractedCents) ?? '$0'} label="Contract value" />
              <Stat value={p.valueSummary.contractedJobs} label="Jobs with contract value" />
            </div>
            <Definition text={p.definitions.valueSummary} />
          </Card>
          <Card>
            <CardHeader title="Data completeness audit" />
            <div className="grid grid--3 gap-4">
              <Stat value={p.dataQuality.missingSource} label="No lead source" />
              <Stat value={p.dataQuality.missingOwner} label="No owner" />
              <Stat value={p.dataQuality.missingFollowUp} label="No follow-up date" />
            </div>
            <Definition text="Missing values are shown as unknown — reports never assume they are complete." />
          </Card>
        </div>
      </div>
    </div>
  )
}

function getReportIcon(id: string) {
  switch (id) {
    case 'speed-to-lead-velocity':
      return <Timer size={18} />
    case 'pipeline-stage-leakage':
      return <GitBranch size={18} />
    case 'lead-source-contract-roi':
      return <DollarSign size={18} />
    case 'roof-inspection-completion-log':
      return <CalendarCheck size={18} />
    case 'sales-rep-activity-matrix':
      return <PhoneCall size={18} />
    case 'dormant-stale-pipeline-recovery':
      return <Clock size={18} />
    case 'follow-up-compliance-audit':
      return <CalendarClock size={18} />
    case 'email-deliverability-bounce-audit':
      return <MailCheck size={18} />
    case 'customer-review-generation-tracker':
      return <Star size={18} />
    case 'contracted-vs-estimated-variance':
      return <Scale size={18} />
    case 'subcontractor-crew-engagement':
      return <Users size={18} />
    case 'duplicate-ingestion-audit':
      return <ShieldCheck size={18} />
    case 'stage-dwell-cycle-duration':
      return <Hourglass size={18} />
    case 'contact-reachability-channel-analysis':
      return <Radio size={18} />
    case 'data-completeness-record-health':
      return <FileCheck size={18} />
    default:
      return <BarChart3 size={18} />
  }
}

function Bars({
  rows,
  link,
  extra,
}: {
  rows: CountRow[]
  link?: (r: CountRow) => string
  extra?: (r: CountRow) => string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (!rows.length) return <EmptyState compact title="No data in this window" />
  return (
    <div className="stack gap-3">
      {rows.map((r) => (
        <div key={`${r.key}-${r.label}`} className="stack gap-1">
          <div className="row row--between gap-2">
            {link ? (
              <Link className="text text--sm link" to={link(r)}>
                {r.label}
              </Link>
            ) : (
              <span className="text text--sm">{r.label}</span>
            )}
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

const Definition = ({ text }: { text?: string }) =>
  text ? <p className="text text--xs text--muted mt-4">{text}</p> : null
