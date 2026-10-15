import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

type CardProps = HTMLAttributes<HTMLElement> & { variant?: 'compact' | 'flush' | 'subtle'; interactive?: boolean; as?: 'section' | 'div' | 'article' }

export function Card({ variant, interactive, as: As = 'section', className, ...rest }: CardProps) {
  return <As className={cx('card', variant && `card--${variant}`, interactive && 'card--interactive', className)} {...rest} />
}

export function CardHeader({ title, actions, as: As = 'h2' }: { title: ReactNode; actions?: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="card__header">
      <As className="card__title">{title}</As>
      {actions ? <div className="action-bar">{actions}</div> : null}
    </div>
  )
}

export const CardSection = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => <div className={cx('card__section', className)} {...rest} />
export const CardFooter = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => <div className={cx('card__footer', className)} {...rest} />
