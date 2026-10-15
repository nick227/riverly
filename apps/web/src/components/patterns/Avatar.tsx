import type { ReactNode } from 'react'
import { initials } from '@project/shared/normalize'
import { cx } from '@/lib/cx'

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span className={cx('avatar', size !== 'md' && `avatar--${size}`)} aria-hidden>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  )
}

/** Shared avatar + name alignment used everywhere a person or contact is shown. */
export function Identity({ name, src, size = 'md', primary, secondary }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg'; primary?: ReactNode; secondary?: ReactNode }) {
  return (
    <span className="identity">
      <Avatar name={name} src={src} size={size} />
      <span className="identity__text">
        <span className="text text--sm text--strong text--truncate">{primary ?? name}</span>
        {secondary ? <span className="text text--xs text--muted text--truncate">{secondary}</span> : null}
      </span>
    </span>
  )
}
