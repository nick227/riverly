import { useState } from 'react'
import { ArrowRight, ExternalLink, Mail, MoreHorizontal } from 'lucide-react'
import type { OpportunityStatus, Resource, StageDef } from '@project/sdk'
import { useEmailTemplates, useSetOpportunityStatus, useTransitionOpportunity } from '@project/sdk'
import { Button, IconButton, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Menu, MenuDivider, MenuItem, MenuLabel } from '@/components/patterns/Menu'
import { Overlay } from '@/components/patterns/Overlay'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateOnly } from '@/lib/format'
import { statusLabel, statusTone } from '../config/labels'
import { FieldControl, type ControlContext } from './FieldControl'

const WIDE = new Set(['textarea', 'contact_log', 'progress_log', 'gallery'])

/**
 * The single workspace used for every stage (and stacked for Full Record). Configuration
 * decides which controls appear; viewing a stage never changes the job's stage.
 */
export function StageWorkspace({ stage, ctx, resources, id }: { stage: StageDef; ctx: ControlContext; resources: Resource[]; id?: string }) {
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

  return (
    <Card as="section" id={id} aria-labelledby={`stage-${stage.id}`}>
      <div className="crm-workspace__header">
        <div className="crm-workspace__status">
          <h2 id={`stage-${stage.id}`} className="heading heading--4">
            {stage.label}
          </h2>
          <span className="text text--sm text--muted">
            {isCurrent
              ? `Current stage${job.stageEnteredAt ? ` since ${dateOnly(job.stageEnteredAt, ctx.timezone)}` : ''}`
              : entered
                ? `Reached ${dateOnly(entered.occurredAt, ctx.timezone)} · job is in ${view.stageLabel(job.stageId)}`
                : `Viewing · job is in ${view.stageLabel(job.stageId)}`}
          </span>
        </div>
        <div className="row gap-2">
          {job.status !== 'OPEN' ? <Badge tone={statusTone(job.status)}>{statusLabel(job.status)}</Badge> : null}
          <StageActions stage={stage} ctx={ctx} />
        </div>
      </div>

      {stage.instructions || stage.description ? <p className="crm-workspace__instructions" style={{ marginBottom: 'var(--space-5)' }}>{stage.instructions ?? stage.description}</p> : null}

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

      {stageResources.length || stageTemplates.length ? (
        <div className="crm-workspace__footer">
          <div className="crm-workspace__resources">
            {stageResources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" title={r.description ?? undefined}>
                {r.label} <ExternalLink aria-hidden />
              </a>
            ))}
          </div>
          <div className="action-bar">
            {stageTemplates.map((t) => (
              <Button key={t!.id} size="sm" variant="secondary" onClick={() => ctx.openEmail(t!.stableKey)}>
                <Mail aria-hidden /> {t!.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

/** Explicit, logged stage moves (forward or back) and lifecycle status — never gated. */
function StageActions({ stage, ctx }: { stage: StageDef; ctx: ControlContext }) {
  const { job, view } = ctx
  const transition = useTransitionOpportunity(job.id)
  const setStatus = useSetOpportunityStatus(job.id)
  const [dialog, setDialog] = useState<{ kind: 'move'; toStageId: string } | { kind: 'status'; status: OpportunityStatus } | null>(null)
  const [reason, setReason] = useState('')
  const isCurrent = job.stageId === stage.id
  const next = view.nextStage(job.stageId)
  const target = isCurrent ? next : stage
  const backward = target ? view.stageIndex(target.id) < view.stageIndex(job.stageId) : false

  function move(toStageId: string, why?: string) {
    transition.mutate(
      { toStageId, reason: why || null },
      { onSuccess: () => (toast.success(`Moved to ${view.stageLabel(toStageId)}`), setDialog(null), setReason('')), onError: (e) => toast.error(e) },
    )
  }
  function applyStatus(status: OpportunityStatus, why?: string) {
    setStatus.mutate({ status, reason: why || null }, { onSuccess: () => (toast.success(`Marked ${statusLabel(status).toLowerCase()}`), setDialog(null), setReason('')), onError: (e) => toast.error(e) })
  }

  return (
    <>
      {target && !stage.retired ? (
        <Button
          size="sm"
          variant={isCurrent ? 'primary' : 'secondary'}
          loading={transition.isPending}
          onClick={() => (backward ? setDialog({ kind: 'move', toStageId: target.id }) : move(target.id))}
        >
          {isCurrent ? (view.stage(job.stageId)?.primaryActionLabel ?? `Move to ${target.label}`) : backward ? 'Move job back here' : 'Move job here'}
          {isCurrent ? <ArrowRight aria-hidden /> : null}
        </Button>
      ) : null}
      <Menu label="Stage options" trigger={(p) => <IconButton label="Stage options" icon={<MoreHorizontal />} size="sm" {...p} />}>
        {(close) => (
          <>
            <MenuLabel>Move job to</MenuLabel>
            {view.active
              .filter((s) => s.id !== job.stageId)
              .map((s) => (
                <MenuItem
                  key={s.id}
                  onSelect={() => {
                    close()
                    view.stageIndex(s.id) < view.stageIndex(job.stageId) ? setDialog({ kind: 'move', toStageId: s.id }) : move(s.id)
                  }}
                >
                  {s.label}
                </MenuItem>
              ))}
            <MenuDivider />
            {job.status === 'OPEN' || job.status === 'WON' ? (
              <>
                <MenuItem onSelect={() => (close(), setDialog({ kind: 'status', status: 'ON_HOLD' }))}>Put on hold</MenuItem>
                <MenuItem onSelect={() => (close(), setDialog({ kind: 'status', status: 'LOST' }))}>Mark lost</MenuItem>
                <MenuItem onSelect={() => (close(), setDialog({ kind: 'status', status: 'CANCELED' }))}>Cancel job</MenuItem>
              </>
            ) : (
              <MenuItem onSelect={() => (close(), applyStatus('OPEN'))}>Reopen job</MenuItem>
            )}
          </>
        )}
      </Menu>
      <Overlay
        open={!!dialog}
        onRequestClose={() => setDialog(null)}
        title={dialog?.kind === 'move' ? `Move back to ${view.stageLabel(dialog.toStageId)}` : dialog ? statusLabel(dialog.status) : ''}
        footer={
          <>
            <span />
            <div className="action-bar">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={transition.isPending || setStatus.isPending}
                disabled={dialog?.kind === 'status' && dialog.status !== 'ON_HOLD' && !reason.trim()}
                onClick={() => (dialog?.kind === 'move' ? move(dialog.toStageId, reason) : dialog && applyStatus(dialog.status, reason))}
              >
                Confirm
              </Button>
            </div>
          </>
        }
      >
        <Field label={dialog?.kind === 'status' && dialog.status !== 'ON_HOLD' ? 'Reason (required)' : 'Reason (optional)'} hint="Saved with the job’s history.">
          {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}
        </Field>
      </Overlay>
    </>
  )
}

