import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useSalesBoard, type SalesBoard as Board } from '@project/sdk'
import { Avatar } from '@/components/patterns/Avatar'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, SkeletonList } from '@/components/patterns/States'
import { cx } from '@/lib/cx'
import { money } from '@/lib/format'
import type { WorkflowView } from '../config/workflow'

type Period = 'today' | 'week'

/**
 * Live scoreboard beside the company river, in the spirit of a sales-floor wallboard:
 * running totals for today or this week, the biggest sale and who is leading.
 */
export function SalesBoard({ view }: { view: WorkflowView }) {
  const [period, setPeriod] = useState<Period>('today')
  const q = useSalesBoard(period)
  const since = period === 'today' ? 'yesterday' : 'last week'
  return (
    <aside className="crm-board" aria-label="Sales board">
      <div className="crm-board__head">
        <span className="crm-board__live" aria-hidden />
        <h2 className="heading heading--4 grow">Scoreboard</h2>
        <Segmented<Period> label="Board period" value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }]} />
      </div>
      {q.isLoading ? (
        <SkeletonList rows={3} height={96} />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <BoardBody board={q.data} since={since} view={view} />
      )}
    </aside>
  )
}

function BoardBody({ board: b, since, view }: { board: Board; since: string; view: WorkflowView }) {
  const m = b.metrics
  return (
    <>
      <Card variant="compact" className="crm-board__hero">
        <span className="crm-board__label">Sales</span>
        <span className="crm-board__money">{money(m.salesValueCents) ?? '$0'}</span>
        <span className="text text--sm text--secondary">
          {m.sales} {m.sales === 1 ? 'contract' : 'contracts'} signed <Delta now={m.salesValueCents} before={b.previous.salesValueCents} since={since} format={(n) => money(n) ?? '$0'} />
        </span>
      </Card>

      <div className="crm-board__grid">
        <Stat label="Calls" value={m.calls} previous={b.previous.calls} since={since} />
        <Stat label="New leads" value={m.newLeads} previous={b.previous.newLeads} since={since} />
        <Stat label="Inspections booked" value={m.inspectionsBooked} previous={b.previous.inspectionsBooked} since={since} />
        <Stat label="Contracts" value={m.sales} previous={b.previous.sales} since={since} />
        <Stat label="Open leads" value={m.openLeads} hint="right now" />
        <Stat label="Inspections pending" value={m.inspectionsPending} hint="scheduled" />
      </div>

      {b.topSale ? (
        <Card variant="compact" className="crm-board__top">
          <span className="crm-board__label">
            <Trophy size={14} aria-hidden /> Top sale
          </span>
          <span className="crm-board__money crm-board__money--sm">{money(b.topSale.valueCents)}</span>
          <Link to={`/jobs/${b.topSale.opportunityId}`} className="text text--sm text--medium text--truncate link">
            {b.topSale.contactName} · {b.topSale.title}
          </Link>
          {b.topSale.owner ? (
            <span className="text text--xs text--muted">
              Closed by{' '}
              <Link to={`/u/${b.topSale.owner.slug}`} className="link">
                {b.topSale.owner.displayName}
              </Link>
            </span>
          ) : null}
        </Card>
      ) : null}

      <Card variant="compact">
        <CardHeader as="h3" title="Leaders" />
        {b.leaders.length ? (
          <ol className="crm-board__leaders">
            {b.leaders.map((l, i) => (
              <li key={l.user.id} className={cx('crm-board__leader', i === 0 && 'is-first')}>
                <span className="crm-board__rank">{i + 1}</span>
                <Link to={`/u/${l.user.slug}`} aria-label={l.user.displayName}>
                  <Avatar name={l.user.displayName} src={l.user.avatarUrl} size="sm" />
                </Link>
                <Link to={`/u/${l.user.slug}`} className="stack gap-1 grow" style={{ minWidth: 0 }}>
                  <span className="text text--sm text--medium text--truncate">{l.user.displayName}</span>
                  <span className="text text--xs text--muted">
                    {l.sales} {l.sales === 1 ? 'sale' : 'sales'} · {l.calls} {l.calls === 1 ? 'call' : 'calls'}
                  </span>
                </Link>
                {l.salesValueCents ? <span className="text text--sm text--medium text--tabular">{money(l.salesValueCents)}</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState compact title={`No calls or sales yet. First ${view.terms.owner.toLowerCase()} on the board leads.`} />
        )}
      </Card>
    </>
  )
}

function Stat({ label, value, previous, since, hint }: { label: string; value: number; previous?: number; since?: string; hint?: string }) {
  return (
    <div className="crm-board__stat">
      <span className="crm-board__value">{value}</span>
      <span className="crm-board__label">{label}</span>
      {previous !== undefined && since ? <Delta now={value} before={previous} since={since} /> : <span className="text text--xs text--muted">{hint}</span>}
    </div>
  )
}

/** Change against the same span earlier ("+3 vs yesterday"); green when up. */
function Delta({ now, before, since, format = String }: { now: number; before: number; since: string; format?: (n: number) => string }) {
  const diff = now - before
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const text = diff === 0 ? `same as ${since}` : `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))} vs ${since}`
  return <span className={cx('crm-board__delta', `crm-board__delta--${tone}`)}>{text}</span>
}
