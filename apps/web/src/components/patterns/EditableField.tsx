import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Button } from '@/components/primitives/Controls'

/**
 * Inline edit with one documented rule: click (or Enter/Space) opens the editor; Save or
 * Enter (single-line) commits; Escape cancels. The value only changes after the server
 * acknowledges; on failure the editor stays open with the user's input preserved.
 */
export function EditableField<T>({
  display,
  value,
  onSave,
  renderEditor,
  disabled,
  emptyLabel = 'Add',
  multiline,
  label,
}: {
  display: ReactNode
  value: T
  onSave: (next: T) => Promise<unknown>
  renderEditor: (args: { value: T; setValue: (v: T) => void; commit: () => void; cancel: () => void; autoFocus: boolean }) => ReactNode
  disabled?: boolean
  emptyLabel?: string
  multiline?: boolean
  label: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const isEmpty = display === null || display === undefined || display === ''

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function commit(next: T = draft) {
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      setEditing(false)
    } catch (err) {
      setError((err as Error).message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }
  const cancel = () => {
    setEditing(false)
    setDraft(value)
    setError(null)
  }

  if (disabled) return <div className={cx('field__value', isEmpty && 'is-empty')}>{isEmpty ? '—' : display}</div>

  if (!editing) {
    return (
      <button type="button" className={cx('editable', isEmpty && 'is-empty')} onClick={() => setEditing(true)} aria-label={`Edit ${label}`}>
        <span className="text--truncate">{isEmpty ? emptyLabel : display}</span>
        <Pencil className="editable__affordance" aria-hidden />
      </button>
    )
  }

  return (
    <div
      ref={wrapper}
      className="editable-form"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel()
        if (e.key === 'Enter' && !multiline && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault()
          void commit()
        }
      }}
    >
      {renderEditor({ value: draft, setValue: setDraft, commit: () => void commit(), cancel, autoFocus: true })}
      {error ? <span className="field__error" role="alert">{error}</span> : null}
      <div className="action-bar">
        <Button size="sm" variant="primary" loading={saving} onClick={() => void commit()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
