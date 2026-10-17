import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; label: string; className?: string }) {
  return (
    <div className={cx('segmented', className)} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={cx('segmented__item', o.value === value && 'is-active')} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined ? <span className="segmented__count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
