import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type BadgeTone = 'neutral' | 'outline' | 'success' | 'warning' | 'danger' | 'accent'

export function Badge({ tone = 'neutral', children, title, className }: { tone?: BadgeTone; children: ReactNode; title?: string; className?: string }) {
  return (
    <span className={cx('badge', tone !== 'neutral' && `badge--${tone}`, className)} title={title}>
      {children}
    </span>
  )
}
