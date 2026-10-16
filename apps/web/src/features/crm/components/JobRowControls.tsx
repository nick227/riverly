import { useState } from 'react'
import type { OpportunityStatus, OpportunitySummary } from '@project/sdk'
import { useMembers, useSetOpportunityStatus, useUpdateOpportunity } from '@project/sdk'
import { Button, Select, Textarea } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { useSession } from '@/lib/session'
import { statusLabel } from '../config/labels'

const STATUSES: OpportunityStatus[] = ['OPEN', 'WON', 'ON_HOLD', 'LOST', 'CANCELED']
const NEEDS_REASON: OpportunityStatus[] = ['LOST', 'CANCELED']

/**
 * Inline owner picker for a list row. Managers assign anyone; members can only claim an
 * unassigned job for themselves (the server enforces the same rule).
 */
export function OwnerSelect({ job }: { job: OpportunitySummary }) {
  const { me, can } = useSession()
  const members = useMembers()
  const update = useUpdateOpportunity(job.id)
  const manager = can('jobs.assign_any')
  const active = (members.data ?? []).filter((m) => m.status === 'ACTIVE' || m.userId === job.owner?.id)
  const options = manager
    ? active.map((m) => ({ value: m.userId, label: m.userId === me?.id ? `${m.displayName} (you)` : m.displayName }))
    : job.owner
      ? [{ value: job.owner.id, label: job.owner.displayName }]
      : me
        ? [{ value: me.id, label: 'Assign to me' }]
        : []
  const locked = !manager && !!job.owner
  return (
    <Select
      size_="sm"
      className={cx('crm-job-row__select', !job.owner && 'is-empty', locked && 'is-locked')}
      aria-label={`Assigned to for ${job.contactName}`}
      title={locked ? 'Only managers can reassign jobs' : undefined}
      value={job.owner?.id ?? ''}
      disabled={locked || update.isPending}
      placeholder="Unassigned"
      options={options}
      onChange={(e) =>
        update.mutate(
          { ownerId: e.target.value || null },
          { onSuccess: (j) => toast.success(j.owner ? `Assigned to ${j.owner.displayName}` : 'Unassigned'), onError: (err) => toast.error(err) },
        )
      }
    />
  )
}

/** Inline status picker. Lost and Canceled ask for a short reason, as the server requires. */
export function StatusSelect({ job }: { job: OpportunitySummary }) {
  const set = useSetOpportunityStatus(job.id)
  const [pending, setPending] = useState<OpportunityStatus | null>(null)
  const apply = (status: OpportunityStatus, reason?: string) =>
    set.mutate(
      { status, reason: reason || null },
      {
        onSuccess: () => {
          setPending(null)
          toast.success(`${job.contactName} marked ${statusLabel(status).toLowerCase()}`)
        },
        onError: (err) => toast.error(err),
      },
    )
  return (
    <>
      <Select
        size_="sm"
        className={cx('crm-job-row__select', `crm-job-row__status--${job.status.toLowerCase()}`)}
        aria-label={`Status for ${job.contactName}`}
        value={job.status}
        disabled={set.isPending}
        options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
        onChange={(e) => {
          const status = e.target.value as OpportunityStatus
          if (NEEDS_REASON.includes(status)) setPending(status)
          else apply(status)
        }}
      />
      {pending ? <ReasonDialog job={job} status={pending} saving={set.isPending} onCancel={() => setPending(null)} onConfirm={(reason) => apply(pending, reason)} /> : null}
    </>
  )
}

function ReasonDialog({ job, status, saving, onCancel, onConfirm }: { job: OpportunitySummary; status: OpportunityStatus; saving: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Overlay
      open
      onRequestClose={onCancel}
      title={`Mark ${job.contactName} ${statusLabel(status).toLowerCase()}`}
      footer={
        <div className="action-bar">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!reason.trim()} loading={saving} onClick={() => onConfirm(reason.trim())}>
            Mark {statusLabel(status).toLowerCase()}
          </Button>
        </div>
      }
    >
      <Field label="Reason" hint="Logged on the job's Activity so the team knows why.">
        {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="e.g. Went with a lower bid" />}
      </Field>
    </Overlay>
  )
}
