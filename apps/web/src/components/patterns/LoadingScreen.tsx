import { useEffect, useState, useSyncExternalStore } from 'react'
import { cx } from '@/lib/cx'

type Entry = { id: number; label: string; delayed: boolean }
let entries: Entry[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const EXIT_MS = 260
const DEFAULT_MIN_MS = 2000

function add(label: string, delayed: boolean) {
  const id = nextId++
  entries = [...entries, { id, label, delayed }]
  emit()
  return id
}

function remove(id: number) {
  entries = entries.filter((e) => e.id !== id)
  emit()
}

/**
 * Full-screen branded loader for transitions (sign in/out) and heavy pages.
 * `start` shows it immediately; `done()` hides it once `minMs` has passed since start,
 * `cancel()` hides it now (use on errors so the form is usable again).
 */
export const loadingScreen = {
  start(label = 'Loading', { minMs = DEFAULT_MIN_MS }: { minMs?: number } = {}) {
    const id = add(label, false)
    const startedAt = Date.now()
    let settled = false
    return {
      done() {
        if (settled) return
        settled = true
        setTimeout(() => remove(id), Math.max(0, minMs - (Date.now() - startedAt)))
      },
      cancel() {
        if (settled) return
        settled = true
        remove(id)
      },
    }
  },
}

/**
 * Declarative form for heavy pages or Suspense fallbacks: shown while mounted.
 * Fades in after a short delay so fast loads never flash a full-screen takeover.
 */
export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  useEffect(() => {
    const id = add(label, true)
    return () => remove(id)
  }, [label])
  return null
}

/** Mounted once at the app root; renders the most recent active entry. */
export function LoadingScreenRegion() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => entries,
  )
  const current = list[list.length - 1] ?? null
  const [shown, setShown] = useState<Entry | null>(current)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (current) {
      setShown(current)
      setLeaving(false)
      return
    }
    setLeaving(true)
    const t = setTimeout(() => setShown(null), EXIT_MS)
    return () => clearTimeout(t)
  }, [current])

  useEffect(() => {
    if (!shown || leaving) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [shown, leaving])

  if (!shown) return null
  return (
    <div
      className={cx('loading-screen', shown.delayed && 'loading-screen--delayed', leaving && 'is-leaving')}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
    >
      <div className="loading-screen__center">
        <svg className="loading-screen__mark" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7" />
          <path className="loading-screen__river" d="M7 20c4-6 7 2 11-4s6-2 7-3" pathLength={1} />
        </svg>
        <span className="loading-screen__wordmark">RIVERLY</span>
        <span className="loading-screen__track" aria-hidden>
          <span className="loading-screen__bar" />
        </span>
        <span className="loading-screen__label">{shown.label}</span>
      </div>
    </div>
  )
}
