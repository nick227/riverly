import type { ReactNode } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { cx } from '@/lib/cx'

export const Spinner = ({ size }: { size?: 'lg' }) => <span className={cx('spinner', size === 'lg' && 'spinner--lg')} role="status" aria-label="Loading" />

export function PageState({ children }: { children?: ReactNode }) {
  return <div className="page-state">{children ?? <Spinner size="lg" />}</div>
}

export function Skeleton({ width = '100%', height = 16, className }: { width?: number | string; height?: number | string; className?: string }) {
  return <div className={cx('skeleton', className)} style={{ width, height }} aria-hidden />
}

/** Stacked skeleton rows for any loading list/card. */
export function SkeletonList({ rows = 3, height = 56 }: { rows?: number; height?: number }) {
  return (
    <div className="stack gap-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  )
}

export function EmptyState({ title, action, compact }: { title: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      <span>{title}</span>
      {action}
    </div>
  )
}

export function Notice({ tone, children }: { tone?: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <div className={cx('notice', tone && `notice--${tone}`)} role={tone ? 'alert' : undefined}>
      {tone ? <AlertTriangle aria-hidden /> : <Info aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = (error as { status?: number })?.status
  const message =
    status === 404 ? 'This record does not exist or you do not have access to it.' : status === 403 ? 'You do not have access to this.' : (error as Error)?.message || 'Something went wrong.'
  return (
    <div className="empty">
      <span>{message}</span>
      {onRetry && status !== 404 && status !== 403 ? (
        <button className="button button--secondary button--sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
