import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Label + control/value with consistent alignment. `inline` puts the label beside the value. */
export function Field({
  label,
  hint,
  error,
  inline,
  children,
  htmlFor,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  inline?: boolean
  children: ReactNode | ((id: string) => ReactNode)
  htmlFor?: string
  className?: string
}) {
  const generated = useId()
  const id = htmlFor ?? generated
  return (
    <div className={cx('field', inline && 'field--inline', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="stack gap-1">
        {typeof children === 'function' ? children(id) : children}
        {error ? <span className="field__error" role="alert">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
      </div>
    </div>
  )
}

export function FieldValue({ children, empty = '—' }: { children?: ReactNode; empty?: ReactNode }) {
  const isEmpty = children === null || children === undefined || children === ''
  return <div className={cx('field__value', isEmpty && 'is-empty')}>{isEmpty ? empty : children}</div>
}

export const FieldGroup = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('field-group', className)}>{children}</div>
export const FieldList = ({ children }: { children: ReactNode }) => <div className="field-list">{children}</div>
