import { useSyncExternalStore } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { cx } from '@/lib/cx'

type ToastItem = { id: number; kind: 'success' | 'error'; message: string }
let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function push(kind: ToastItem['kind'], message: string) {
  const id = nextId++
  items = [...items, { id, kind, message }].slice(-4)
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, kind === 'error' ? 6000 : 3200)
}

/** Mutation feedback. Only call `success` after the server confirmed the write. */
export const toast = {
  success: (message: string) => push('success', message),
  error: (err: unknown, fallback = 'Something went wrong') => push('error', (err as Error)?.message || fallback),
}

export function ToastRegion() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => items,
  )
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('toast', t.kind === 'error' && 'toast--error')}>
          {t.kind === 'error' ? <AlertCircle aria-hidden /> : <Check aria-hidden />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
