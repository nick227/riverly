import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { useActivity, useNewActivityCount, type ActivityParams } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, SkeletonList } from '@/components/patterns/States'
import { cx } from '@/lib/cx'
import { useDebounce } from '@/lib/useDebounce'
import type { WorkflowView } from '../config/workflow'
import { ActivityItem } from './ActivityItem'

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
  centered,
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
  centered?: boolean
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
  const items = feed.data?.pages.flatMap((p) => p.data) ?? []

  return (
    <section className={cx('crm-activity', centered && 'crm-activity--centered')} aria-label="Activity">
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
          {items.map((item) => (
            <ActivityItem key={item.id} item={item} view={view} showSubject={showSubject} timezone={timezone} />
          ))}
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
