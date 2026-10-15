import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Spinner } from '@/components/patterns/States'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; block?: boolean }

const buttonClass = (variant: Variant, size: 'sm' | 'md', block?: boolean, extra?: string) =>
  cx('button', `button--${variant}`, size === 'sm' && 'button--sm', block && 'button--block', extra)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, block, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
})

export function ButtonLink({ variant = 'secondary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <Link className={buttonClass(variant, size, false, className)} {...rest} />
}

/** External or protocol links (tel:, sms:, mailto:, https:) styled as buttons. */
export function ButtonAnchor({ variant = 'secondary', size = 'md', className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <a className={buttonClass(variant, size, false, className)} {...rest} />
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string; icon: ReactNode }>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, ...rest },
  ref,
) {
  return (
    <Button ref={ref} variant={variant} size={size} className={cx('button--icon', className)} aria-label={label} title={label} {...rest}>
      {icon}
    </Button>
  )
})

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; size_?: 'sm' }>(function Input(
  { className, invalid, size_, ...rest },
  ref,
) {
  return <input ref={ref} className={cx('input', size_ === 'sm' && 'input--sm', invalid && 'is-invalid', className)} aria-invalid={invalid || undefined} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx('textarea', invalid && 'is-invalid', className)} aria-invalid={invalid || undefined} {...rest} />
})

type Option = { value: string; label: string; disabled?: boolean }

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string; size_?: 'sm' }>(function Select(
  { options, placeholder, className, size_, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx('select', size_ === 'sm' && 'select--sm', className)} {...rest}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  )
})

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  )
}
