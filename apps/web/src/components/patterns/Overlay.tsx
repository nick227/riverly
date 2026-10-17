import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { IconButton } from '@/components/primitives/Controls'

export type OverlayVariant = 'modal' | 'wide' | 'sheet' | 'full'

/**
 * One overlay shell for modals, side sheets and full-screen views. Traps focus, closes on
 * Escape/backdrop (through `onRequestClose`, which may veto to protect unsaved edits) and
 * restores focus to whatever opened it — the underlying page keeps its state.
 */
export function Overlay({
  open,
  onRequestClose,
  title,
  headerExtra,
  footer,
  children,
  variant = 'modal',
  className,
}: {
  open: boolean
  onRequestClose: () => void
  title: ReactNode
  headerExtra?: ReactNode
  footer?: ReactNode
  children: ReactNode
  variant?: OverlayVariant
  className?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)
  const closeRef = useRef(onRequestClose)
  closeRef.current = onRequestClose

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panel.current?.querySelector<HTMLElement>('[autofocus], input, textarea, select, button:not([data-close])')
    ;(first ?? panel.current)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')]
        if (!items.length) return
        const firstEl = items[0]!
        const lastEl = items[items.length - 1]!
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      ;(opener.current as HTMLElement | null)?.focus?.()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className={cx('overlay', variant !== 'modal' && `overlay--${variant}`, className)}>
      <div className="overlay__backdrop" onClick={() => closeRef.current()} />
      <div className="overlay__panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="overlay-title" tabIndex={-1}>
        <div className="overlay__header">
          <h2 id="overlay-title" className="heading heading--4">
            {title}
          </h2>
          <div className="action-bar">
            {headerExtra}
            <IconButton label="Close" icon={<X />} data-close onClick={() => closeRef.current()} />
          </div>
        </div>
        <div className="overlay__body">{children}</div>
        {footer ? <div className="overlay__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
