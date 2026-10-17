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
export function SalesBoard(_props: { view: WorkflowView }) {
  const [period, setPeriod] = useState<Period>('today')
  const q = useSalesBoard(period)
  return (
    <aside className="crm-board" aria-label="Activity overview">
      <div className="crm-board__head">
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }]}
          label="Overview period"
        />
      </div>
      {q.isLoading ? (
        <SkeletonList rows={3} height={96} />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <BoardBody board={q.data} period={period} />
      )}
    </aside>
  )
}

function BoardBody({ board: b, period }: { board: Board; period: Period }) {
  const m = b.metrics
  return (
    <>
      <Card variant="flush" className="crm-board__overview">
        <table className="crm-board__table">
          <caption className="visually-hidden">Activity totals for {period === 'today' ? 'today' : 'this week'}. Open leads and pending inspections reflect current totals.</caption>
          <thead>
            <tr>
              <th scope="col">Activity</th>
              <th scope="col">{period === 'today' ? 'Today' : 'This week'}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="crm-board__sales-row">
              <th scope="row">Sales value</th>
              <td>{money(m.salesValueCents) ?? '$0'}</td>
            </tr>
            <Stat label="Contracts" value={m.sales} />
            <Stat label="Calls" value={m.calls} />
            <Stat label="New leads" value={m.newLeads} />
            <Stat label="Inspections booked" value={m.inspectionsBooked} />
          </tbody>
          <tbody className="crm-board__current">
            <Stat label="Open leads" value={m.openLeads} hint="Right now" />
            <Stat label="Inspections pending" value={m.inspectionsPending} hint="Scheduled" />
          </tbody>
        </table>
      </Card>

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
          <EmptyState compact title={`No calls or sales yet.`} />
        )}
      </Card>
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <tr>
      <th scope="row">
        {label}
        {hint ? <span className="crm-board__hint">{hint}</span> : null}
      </th>
      <td>{value.toLocaleString()}</td>
    </tr>
  )
}
