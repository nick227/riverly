import type { CSSProperties } from 'react'
import type { StageDef } from '@project/sdk'
import { cx } from '@/lib/cx'

/**
 * Bar-only segmented pipeline. `currentStageId` (filled bar) is the job's official state;
 * `selectedStageId` (underlined label) is only what the user is viewing. Selecting never
 * changes the stage.
 */
export function PipelineBar({
  stages,
  currentStageId,
  selectedStageId,
  onSelect,
  meta,
  compact,
  label = 'Pipeline',
}: {
  stages: StageDef[]
  currentStageId: string
  selectedStageId?: string
  onSelect?: (stageId: string) => void
  meta?: Record<string, string | null | undefined>
  compact?: boolean
  label?: string
}) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId)
  const style = { '--stages': stages.length } as CSSProperties
  return (
    <nav className={cx('crm-pipeline', compact && 'crm-pipeline--compact')} style={style} aria-label={label}>
      {stages.map((s, i) => {
        const state = cx(i < currentIndex && 'is-done', i === currentIndex && 'is-current', s.id === selectedStageId && 'is-selected')
        const content = (
          <>
            <span className="crm-pipeline__bar" />
            <span className="crm-pipeline__label">{s.label}</span>
            {!compact ? <span className="crm-pipeline__meta">{meta?.[s.id] ?? ''}</span> : null}
          </>
        )
        if (!onSelect)
          return (
            <span key={s.id} className={cx('crm-pipeline__segment', state)} aria-current={i === currentIndex ? 'step' : undefined}>
              {content}
            </span>
          )
        return (
          <button
            key={s.id}
            type="button"
            className={cx('crm-pipeline__segment', state)}
            onClick={() => onSelect(s.id)}
            aria-current={i === currentIndex ? 'step' : undefined}
            aria-pressed={s.id === selectedStageId}
            aria-label={`${s.label}${i === currentIndex ? ' (current stage)' : ''}${s.id === selectedStageId ? ', viewing' : ''}`}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
