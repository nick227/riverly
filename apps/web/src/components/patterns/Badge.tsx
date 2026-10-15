import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type BadgeTone = 'neutral' | 'outline' | 'success' | 'warning' | 'danger' | 'accent'

export function Badge({ tone = 'neutral', children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span className={cx('badge', tone !== 'neutral' && `badge--${tone}`)} title={title}>
      {children}
    </span>
  )
}
