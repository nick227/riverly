import type { CSSProperties } from 'react'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import type { StageDef } from '@project/sdk'
import { cx } from '@/lib/cx'

/**
 * Unified Segmented Control Bar (Linear / macOS style).
 * A single continuous container bar with an elevated active pill,
 * balanced single-line labels, and interactive status icons.
 */
export function PipelineBar({
  stages,
  currentStageId,
  selectedStageId,
  onSelect,
  onToggleStage,
  meta,
  compact,
  label = 'Pipeline',
}: {
  stages: StageDef[]
  currentStageId: string
  selectedStageId?: string
  onSelect?: (stageId: string) => void
  onToggleStage?: (stageId: string) => void
  meta?: Record<string, string | null | undefined>
  compact?: boolean
  label?: string
}) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId)
  const style = { '--stages': stages.length } as CSSProperties

  return (
    <nav className={cx('crm-pipeline', compact && 'crm-pipeline--compact')} style={style} aria-label={label}>
      {stages.map((s, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const isConfirmed = i <= currentIndex
        const isSelected = s.id === selectedStageId
        const state = cx(
          isDone && 'is-done',
          isCurrent && 'is-current',
          isConfirmed && 'is-confirmed',
          isSelected && 'is-selected',
        )
        const dateMeta = meta?.[s.id]

        const stageTooltip = isDone && dateMeta ? `${s.label} · Completed ${dateMeta}` : s.label

        const content = compact ? (
          <>
            <span className="crm-pipeline__bar" />
            <span className="crm-pipeline__label">{s.label}</span>
          </>
        ) : (
          <div className="crm-pipeline__inner">
            <span
              className="crm-pipeline__status-icon"
              role="button"
              tabIndex={0}
              aria-label={isConfirmed ? `Unconfirm: ${s.label}` : `Confirm: ${s.label}`}
              title={onToggleStage ? (isConfirmed ? `Click to unconfirm ${s.label} and any in front of it` : `Click to confirm ${s.label}`) : undefined}
              onClick={(e) => {
                if (onToggleStage) {
                  e.stopPropagation()
                  onToggleStage(s.id)
                }
              }}
              onKeyDown={(e) => {
                if (onToggleStage && (e.key === 'Enter' || e.key === ' ')) {
                  e.stopPropagation()
                  e.preventDefault()
                  onToggleStage(s.id)
                }
              }}
            >
              {isConfirmed ? (
                <CheckCircle2 className="crm-pipeline__icon crm-pipeline__icon--confirmed" size={16} />
              ) : (
                <Circle className="crm-pipeline__icon crm-pipeline__icon--todo" size={16} />
              )}
            </span>
            <span className="crm-pipeline__label">{s.label}</span>
          </div>
        )

        if (!onSelect)
          return (
            <div
              key={s.id}
              className={cx('crm-pipeline__segment', state)}
              aria-current={isCurrent ? 'step' : undefined}
              title={stageTooltip}
            >
              {content}
            </div>
          )

        return (
          <button
            key={s.id}
            type="button"
            className={cx('crm-pipeline__segment', state)}
            onClick={() => onSelect(s.id)}
            aria-current={isCurrent ? 'step' : undefined}
            aria-pressed={isSelected}
            aria-label={`${s.label}${isSelected ? ', viewing' : ''}`}
            title={stageTooltip}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
