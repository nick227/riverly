import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

type Gap = 1 | 2 | 3 | 4 | 6 | 8
type Props = HTMLAttributes<HTMLElement> & { gap?: Gap; as?: keyof JSX.IntrinsicElements; children?: ReactNode }

export function Stack({ gap = 4, as = 'div', className, ...rest }: Props) {
  return createElement(as, { className: cx('stack', `gap-${gap}`, className), ...rest })
}

export function Row({
  gap = 3,
  as = 'div',
  justify,
  align,
  wrap,
  className,
  ...rest
}: Props & { justify?: 'between' | 'end'; align?: 'start' | 'baseline'; wrap?: boolean }) {
  return createElement(as, {
    className: cx('row', `gap-${gap}`, justify && `row--${justify}`, align && `row--${align}`, wrap && 'row--wrap', className),
    ...rest,
  })
}

export function Grid({
  gap = 4,
  columns,
  min,
  as = 'div',
  className,
  style,
  ...rest
}: Props & { columns?: 2 | 3 | 4 | 'auto'; min?: number }) {
  return createElement(as, {
    className: cx('grid', `gap-${gap}`, columns && `grid--${columns}`, className),
    style: min ? ({ ...style, '--grid-min': `${min}px` } as CSSProperties) : style,
    ...rest,
  })
}

export const Divider = () => <hr className="divider" />
