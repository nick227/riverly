import type { Resource, StageDef } from '@project/sdk'
import { useEmailTemplates, useTransitionOpportunity } from '@project/sdk'
import { Button } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateOnly } from '@/lib/format'
import { statusLabel, statusTone } from '../config/labels'
import { FieldControl, type ControlContext } from './FieldControl'
import { ExternalLink, Mail } from 'lucide-react'

const WIDE = new Set(['textarea', 'contact_log', 'progress_log', 'gallery'])

/**
 * The single, consistent workspace used for every stage.
 * Fixed set height prevents any page jumping or layout shifting.
 * Single "Confirm" button with intentional distinct coloration.
 */
export function StageWorkspace({
  stage,
  ctx,
  resources,
  id,
  onSelectStage,
}: {
  stage: StageDef
  ctx: ControlContext
  resources: Resource[]
  id?: string
  onSelectStage?: (stageId: string) => void
}) {
  const { job, view } = ctx
  const isCurrent = job.stageId === stage.id
  const entered = [...job.transitions].find((t) => t.toStageId === stage.id && t.kind !== 'STATUS')
  const fields = stage.fieldIds.map((fid) => view.field(fid)).filter((f) => f && f.visible !== false)
  const stageResources = resources.filter((r) => r.isActive && r.stageIds.includes(stage.id))
  const templates = useEmailTemplates()
  const stageTemplates = (stage.emailTemplateKeys ?? [])
    .map((k) => templates.data?.find((t) => t.stableKey === k && t.isEnabled))
    .filter(Boolean)
    .slice(0, 3)

  const currentIndex = view.active.findIndex((s) => s.id === stage.id)
  const isPast = currentIndex >= 0 && currentIndex < view.stageIndex(job.stageId)

  return (
    <Card as="section" id={id} className="crm-workspace" aria-labelledby={`stage-${stage.id}`}>
      <div className="crm-workspace__header">
        <div className="crm-workspace__status">
          <h2 id={`stage-${stage.id}`} className="heading heading--3" style={{ margin: 0 }}>
            {stage.label}
          </h2>
          <div className="crm-workspace__meta">
            <span className="text text--sm text--muted">
              {isCurrent
                ? (job.stageEnteredAt ? `Entered ${dateOnly(job.stageEnteredAt, ctx.timezone)}` : 'In progress')
                : entered
                  ? `Reached ${dateOnly(entered.occurredAt, ctx.timezone)} · Current: ${view.stageLabel(job.stageId)}`
                  : `Current: ${view.stageLabel(job.stageId)}`}
            </span>
          </div>
        </div>
        <div className="crm-workspace__actions">
          {job.status !== 'OPEN' ? <Badge tone={statusTone(job.status)}>{statusLabel(job.status)}</Badge> : null}
          <StageConfirmButton stage={stage} ctx={ctx} onSelectStage={onSelectStage} />
        </div>
      </div>

      <div className="crm-workspace__body">
        {stage.instructions || stage.description ? (
          <p className="crm-workspace__instructions">
            {stage.instructions ?? stage.description}
          </p>
        ) : null}

        {fields.length ? (
          <div className="crm-workspace__controls">
            {fields.map((f) => (
              <div key={f!.id} className={cx(WIDE.has(f!.type) && 'crm-workspace__control--wide')}>
                <FieldControl field={f!} ctx={{ ...ctx, stageId: stage.id }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text text--sm text--muted">No controls are configured for this stage.</p>
        )}
      </div>

      <div className="crm-workspace__footer">
        <div className="row gap-4 items-center flex-wrap">
          {stageResources.length ? (
            <div className="crm-workspace__resources">
              {stageResources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" title={r.description ?? undefined}>
                  {r.label} <ExternalLink aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
          {stageTemplates.length ? (
            <div className="action-bar">
              {stageTemplates.map((t) => (
                <Button key={t!.id} size="sm" variant="secondary" onClick={() => ctx.openEmail(t!.stableKey)}>
                  <Mail size={13} aria-hidden /> {t!.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

/**
 * Confirm / Unconfirm button.
 * - On unconfirmed stage: says "Confirm", confirming this stage (does NOT advance to next stage).
 * - On confirmed stage: says "Unconfirm", which unconfirms this stage and any stages in front of it.
 */
export function StageConfirmButton({
  stage,
  ctx,
  onSelectStage,
  size = 'sm',
}: {
  stage: StageDef
  ctx: ControlContext
  onSelectStage?: (stageId: string) => void
  size?: 'sm' | 'md'
}) {
  const { job, view } = ctx
  const transition = useTransitionOpportunity(job.id)

  if (stage.retired) return null

  const stageIndex = view.active.findIndex((s) => s.id === stage.id)
  const currentStageIndex = view.stageIndex(job.stageId)
  const isConfirmed = stageIndex >= 0 && stageIndex <= currentStageIndex

  // Confirmed stage: button says "Unconfirm", which unconfirms this stage and any in front of it
  if (isConfirmed) {
    const isFirstStage = stageIndex === 0
    const isOnlyConfirmed = currentStageIndex === 0
    const disabled = isFirstStage && isOnlyConfirmed
    const targetStage = (stageIndex > 0 ? view.active[stageIndex - 1] : view.active[0]) ?? view.active[0]
    if (!targetStage) return null

    return (
      <Button
        size={size}
        loading={transition.isPending}
        disabled={disabled}
        className="crm-workspace__confirm-btn crm-workspace__confirm-btn--unconfirm"
        title={disabled ? 'First stage cannot be unconfirmed' : `Unconfirm ${stage.label} and any stages in front of it`}
        onClick={() => {
          if (disabled) return
          transition.mutate(
            { toStageId: targetStage.id, reason: null },
            {
              onSuccess: () => {
                toast.success(`Unconfirmed stages in front of ${targetStage.label}`)
                onSelectStage?.(targetStage.id)
              },
              onError: (e) => toast.error(e),
            },
          )
        }}
      >
        Unconfirm
      </Button>
    )
  }

  // Unconfirmed stage: button says "Confirm", which confirms up to this stage (does not advance past it)
  return (
    <Button
      size={size}
      loading={transition.isPending}
      className="crm-workspace__confirm-btn crm-workspace__confirm-btn--confirm"
      title={`Confirm ${stage.label}`}
      onClick={() =>
        transition.mutate(
          { toStageId: stage.id, reason: null },
          {
            onSuccess: () => {
              toast.success(`Confirmed ${stage.label}`)
              onSelectStage?.(stage.id)
            },
            onError: (e) => toast.error(e),
          },
        )
      }
    >
      Confirm
    </Button>
  )
}
