import { createElement, type HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type TextProps = HTMLAttributes<HTMLElement> & {
  size?: 'xs' | 'sm' | 'base'
  tone?: 'muted' | 'secondary' | 'danger' | 'success'
  weight?: 'medium' | 'strong'
  truncate?: boolean
  pre?: boolean
  tabular?: boolean
  as?: 'p' | 'span' | 'div' | 'time'
}

export function Text({ size = 'base', tone, weight, truncate, pre, tabular, as = 'p', className, ...rest }: TextProps) {
  return createElement(as, {
    className: cx(
      'text',
      size !== 'base' && `text--${size}`,
      tone && `text--${tone}`,
      weight && `text--${weight}`,
      truncate && 'text--truncate',
      pre && 'text--pre',
      tabular && 'text--tabular',
      className,
    ),
    ...rest,
  })
}

export function Heading({ level = 2, as, className, ...rest }: HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4 | 5; as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return createElement(as ?? `h${Math.min(level, 4)}`, { className: cx('heading', `heading--${level}`, className), ...rest })
}

export function Label({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('label', className)} {...rest} />
}
