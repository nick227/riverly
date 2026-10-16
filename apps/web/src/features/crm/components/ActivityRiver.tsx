import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Phone, Search } from 'lucide-react'
import { useActivity, useNewActivityCount, type ActivityItem as Item, type ActivityParams } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, SkeletonList } from '@/components/patterns/States'
import { cx } from '@/lib/cx'
import { relative } from '@/lib/format'
import { useDebounce } from '@/lib/useDebounce'
import type { WorkflowView } from '../config/workflow'
import { ActivityItem } from './ActivityItem'
import { activityTone, milestoneLabel, riverRows } from './activityPresentation'

type Filter = NonNullable<ActivityParams['filter']>

/**
 * The Activity river. The company page, a job's history and a stage filter are all
 * projections of the same events. New entries never jump in while reading — a small
 * indicator offers them instead.
 */
export function ActivityRiver({
  base,
  view,
  title,
  composer,
  showFilters,
  stageFilter,
  showSubject = true,
  timezone,
  emptyText = 'No activity yet',
}: {
  base: ActivityParams
  view: WorkflowView
  title?: ReactNode
  composer?: ReactNode
  showFilters?: boolean
  stageFilter?: { stageId: string; label: string }
  showSubject?: boolean
  timezone?: string
  emptyText?: string
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [stageOnly, setStageOnly] = useState(false)
  const debounced = useDebounce(q.trim(), 300)
  const params: ActivityParams = { ...base, filter, q: debounced || undefined, stageId: stageOnly && stageFilter ? stageFilter.stageId : base.stageId }
  const feed = useActivity(params)
  const [since, setSince] = useState<string | null>(null)
  const fetchedAt = useRef(0)
  useEffect(() => {
    if (feed.dataUpdatedAt && feed.dataUpdatedAt !== fetchedAt.current && !feed.isFetchingNextPage) {
      fetchedAt.current = feed.dataUpdatedAt
      setSince(new Date(feed.dataUpdatedAt).toISOString())
    }
  }, [feed.dataUpdatedAt, feed.isFetchingNextPage])
  const fresh = useNewActivityCount(params, since)
  const items = useMemo(() => feed.data?.pages.flatMap((p) => p.data) ?? [], [feed.data])
  const rows = useMemo(() => riverRows(items, timezone), [items, timezone])
  const shared = { view, showSubject, timezone }

  return (
    <section className="crm-activity" aria-label="Activity">
      {title || stageFilter ? (
        <div className="crm-activity__toolbar">
          {title ? <h2 className="heading heading--4">{title}</h2> : <span />}
          {stageFilter ? (
            <Segmented
              label="Stage filter"
              value={stageOnly ? 'stage' : 'all'}
              onChange={(v) => setStageOnly(v === 'stage')}
              options={[
                { value: 'all', label: 'All stages' },
                { value: 'stage', label: stageFilter.label },
              ]}
            />
          ) : null}
        </div>
      ) : null}
      {composer}
      {showFilters ? (
        <div className="crm-activity__toolbar">
          <Segmented
            label="Activity filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'mine', label: 'Mine' },
              { value: 'messages', label: 'Messages' },
              { value: 'team', label: 'Team' },
              { value: 'system', label: 'System' },
            ]}
          />
          <div className="crm-header__search" style={{ maxWidth: 260, marginLeft: 0 }}>
            <Search aria-hidden />
            <Input type="search" aria-label="Search activity" placeholder="Search activity" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      ) : null}
      {fresh.data ? (
        <Button className="crm-activity__new" size="sm" variant="secondary" onClick={() => void feed.refetch()}>
          {fresh.data} new {fresh.data === 1 ? 'entry' : 'entries'} — show
        </Button>
      ) : null}
      {feed.isLoading ? (
        <SkeletonList rows={4} height={64} />
      ) : feed.error ? (
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={debounced ? 'Nothing matches that search' : emptyText} />
      ) : (
        <div className="crm-activity__list">
          {rows.map((row) =>
            row.kind === 'day' ? (
              <h3 key={row.key} className="activity-day">
                {row.label}
              </h3>
            ) : row.kind === 'group' ? (
              <AttemptGroup key={row.key} items={row.items} {...shared} />
            ) : (
              <ActivityEntry key={row.key} item={row.item} {...shared} />
            ),
          )}
        </div>
      )}
      {feed.hasNextPage ? (
        <Button className="crm-activity__new" size="sm" variant="ghost" loading={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
          Load older activity
        </Button>
      ) : null}
    </section>
  )
}

type RowProps = { view: WorkflowView; showSubject: boolean; timezone?: string }

/** One event, tinted by type; milestones (signed contracts, booked inspections, new leads) stand out. */
function ActivityEntry({ item, ...rest }: RowProps & { item: Item }) {
  const milestone = milestoneLabel(item)
  return (
    <div className={cx('activity-entry', `activity-entry--${activityTone(item)}`, milestone && 'activity-entry--milestone')}>
      {milestone ? <span className="activity-entry__eyebrow">{milestone}</span> : null}
      <ActivityItem item={item} {...rest} />
    </div>
  )
}

/** A run of contact attempts by one person, summarised on one row and expandable. */
function AttemptGroup({ items, view, showSubject, timezone }: RowProps & { items: Item[] }) {
  const [open, setOpen] = useState(false)
  const actor = items[0]!.actor!
  const allCalls = items.every((i) => i.methodId === 'phone')
  const outcomes = new Map<string, number>()
  for (const i of items) outcomes.set(view.outcomeLabel(i.outcomeId), (outcomes.get(view.outcomeLabel(i.outcomeId)) ?? 0) + 1)
  const people = [...new Set(items.map((i) => i.contact?.label).filter(Boolean))]
  return (
    <div className="activity-entry activity-entry--call activity-entry--group">
      <article className="activity-item">
        <span className="activity-item__icon">
          <Phone />
        </span>
        <div className="activity-item__body">
          <p className="activity-item__line">
            <strong>{actor.displayName}</strong> {allCalls ? `made ${items.length} calls` : `logged ${items.length} contact attempts`}
          </p>
          <div className="activity-item__meta">
            <time dateTime={items[0]!.occurredAt}>{relative(items[0]!.occurredAt)}</time>
            <span>{[...outcomes].map(([label, n]) => `${n} ${label.toLowerCase()}`).join(', ')}</span>
            {showSubject && people.length ? <span>{people.length > 3 ? `${people.slice(0, 3).join(', ')} +${people.length - 3}` : people.join(', ')}</span> : null}
          </div>
          <div>
            <button type="button" className="reaction" onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? <ChevronDown size={13} aria-hidden /> : <ChevronRight size={13} aria-hidden />} {open ? 'Hide' : 'Show'} {allCalls ? 'calls' : 'attempts'}
            </button>
          </div>
        </div>
      </article>
      {open ? (
        <div className="activity-group__items">
          {items.map((i) => (
            <ActivityItem key={i.id} item={i} view={view} showSubject={showSubject} timezone={timezone} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
