import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Disclosure menu: click to open, closes on outside click / Escape, returns focus to the trigger. */
export function Menu({ trigger, children, align = 'right', label }: { trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode; children: ReactNode | ((close: () => void) => ReactNode); align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    root.current?.querySelector<HTMLElement>('.menu__item')?.focus()
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const close = () => setOpen(false)
  return (
    <div className="menu" ref={root}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open ? (
        <div className={cx('menu__list', align === 'left' && 'menu__list--left')} role="menu" aria-label={label}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  )
}

export function MenuItem({ icon, children, onSelect, href }: { icon?: ReactNode; children: ReactNode; onSelect?: () => void; href?: string }) {
  if (href)
    return (
      <a className="menu__item" role="menuitem" href={href}>
        {icon}
        {children}
      </a>
    )
  return (
    <button type="button" className="menu__item" role="menuitem" onClick={onSelect}>
      {icon}
      {children}
    </button>
  )
}

export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="menu__label">{children}</div>
export const MenuDivider = () => <div className="menu__divider" role="separator" />
