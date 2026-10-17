import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  CalendarClock,
  DollarSign,
  FileText,
  Inbox,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Settings2,
  Sparkles,
  StickyNote,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ActivityItem as Item } from '@project/sdk'
import { useMembers, useRetryMessage } from '@project/sdk'
import { Button } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { toast } from '@/components/patterns/Toast'
import { dateTime, money } from '@/lib/format'
import { useSession } from '@/lib/session'
import { messageStatusLabel, messageStatusTone, statusLabel } from '../config/labels'
import type { WorkflowView } from '../config/workflow'
import { useMemberName } from './MemberSelect'

type Variant = 'compact' | 'rich' | 'attention'
export type DescribeCtx = { view: WorkflowView; showSubject: boolean }
export type Description = { icon: ReactNode; line: ReactNode; content?: ReactNode; variant: Variant; hideNote?: boolean }

type Payload = Record<string, any>
/** Shared pieces every describer needs: the actor, the payload, and the optional " on <job>" suffix. */
type Parts = { item: Item; p: Payload; who: ReactNode; job: ReactNode; view: WorkflowView; showSubject: boolean }

/** Icon, sentence and optional body for an Activity event, chosen from structured type + payload. */
export function describeActivity(item: Item, { view, showSubject }: DescribeCtx): Description {
  const parts: Parts = {
    item,
    view,
    showSubject,
    p: (item.payload ?? {}) as Payload,
    who: item.actor?.slug ? (
      <Link to={`/u/${item.actor.slug}`} className="link text--strong">
        {item.actor.displayName}
      </Link>
    ) : (
      <strong>{item.actor ? item.actor.displayName : item.actorLabel ?? 'Riverly'}</strong>
    ),
    job: showSubject && item.opportunity ? <> on <strong>{item.opportunity.label}</strong></> : null,
  }
  const { p, who, job } = parts
  const fieldLabel = (id: string) => view.field(id)?.label ?? id
  switch (item.type) {
    case 'lead.received':
      return { icon: <Inbox />, variant: 'compact', line: <>{who} — new lead{p.sourceName ? <> from {p.sourceName}</> : null}{showSubject && item.contact ? <>: <strong>{item.contact.label}</strong></> : null}</> }
    case 'contact.attempt':
      return { icon: <Phone />, variant: 'compact', line: <>{who} logged {view.methodLabel(item.methodId).toLowerCase()} — <strong>{view.outcomeLabel(item.outcomeId)}</strong>{job}</> }
    case 'note.added':
      return { icon: <StickyNote />, variant: 'compact', line: <>{who} added a note{job}</> }
    case 'progress.updated':
      return { icon: <Sparkles />, variant: 'rich', line: <>{who} posted a progress update{job}</> }
    case 'correction':
      return { icon: <Pencil />, variant: 'compact', line: <>{who} corrected an earlier entry{item.outcomeId ? <> — outcome is <strong>{view.outcomeLabel(item.outcomeId)}</strong></> : null}</> }
    case 'stage.changed':
      return { icon: <ArrowRightLeft />, variant: 'rich', line: stageChangeLine(parts) }
    case 'status.changed':
      return { icon: <ArrowRightLeft />, variant: 'compact', line: <>{who} marked{job || ' this job'} <strong>{statusLabel(p.toStatus)}</strong></> }
    case 'assignment.changed':
      return { icon: <UserPlus />, variant: 'compact', line: p.toOwnerId ? <>{who} assigned{job || ' this job'} to <OwnerName id={p.toOwnerId} /></> : <>{who} unassigned{job || ' this job'}</> }
    case 'job.updated':
    case 'field.changed':
      return { icon: <Pencil />, variant: 'compact', line: fieldChangesLine(parts, fieldLabel) }
    case 'contact.created':
      return { icon: <UserPlus />, variant: 'compact', line: <>{who} added contact{showSubject && item.contact ? <> <strong>{item.contact.label}</strong></> : null}</> }
    case 'contact.updated':
      return { icon: <Pencil />, variant: 'compact', line: <>{who} updated contact details ({(p.changes ?? []).map((c: { field: string }) => c.field).join(', ')})</> }
    case 'file.uploaded':
      return { icon: <Upload />, variant: 'rich', line: <>{who} uploaded {p.fieldId ? <>to <strong>{fieldLabel(p.fieldId)}</strong></> : 'a file'}{job}</> }
    case 'file.removed':
      return { icon: <FileText />, variant: 'compact', line: <>{who} removed {p.fileName}{job}</> }
    case 'appointment.scheduled':
    case 'appointment.rescheduled':
    case 'appointment.completed':
    case 'appointment.canceled':
    case 'appointment.no_show':
    case 'appointment.updated':
      return { icon: <CalendarClock />, variant: 'compact', line: appointmentLine(parts) }
    case 'participant.added':
      return {
        icon: <Users />,
        variant: 'compact',
        line: (
          <>
            {who} added {p.memberUserId ? <MemberName id={p.memberUserId} /> : (p.name ?? 'a team member')} as {p.roleKey}{job}
          </>
        ),
      }
    case 'participant.removed':
      return { icon: <Users />, variant: 'compact', line: <>{who} removed a {p.roleKey}{job}</> }
    case 'finance.reference_added':
    case 'finance.reference_updated':
      return { icon: <DollarSign />, variant: 'compact', line: financeLine(parts) }
    case 'email.message':
    case 'review.requested':
      return describeEmail(parts)
    case 'post.created':
      return {
        icon: <MessageCircle />,
        variant: 'rich',
        line: <>{who}{job ? <> posted{job}</> : null}</>,
        content: item.post?.deleted ? <p className="text text--sm text--muted">This post was removed.</p> : <p className="activity-item__note">{item.post?.body}</p>,
      }
    case 'recognition.given':
      return describeRecognition(parts)
    case 'import.completed':
      return { icon: <Inbox />, variant: p.duplicatesFlagged || p.errors ? 'attention' : 'compact', line: importLine(parts) }
    case 'intake.review_needed':
      return {
        icon: <AlertTriangle />,
        variant: 'attention',
        line: <>New lead <strong>{p.name}</strong> from {p.sourceName} may match an existing contact.</>,
        content: (
          <div>
            <Link className="button button--secondary button--sm" to="/contacts/review">
              Review match
            </Link>
          </div>
        ),
      }
    case 'workflow.published':
      return { icon: <Settings2 />, variant: 'compact', line: <>{who} published workflow version {p.version}</> }
    case 'member.joined':
      return { icon: <UserPlus />, variant: 'rich', line: <>{who} joined the team</> }
    case 'member.role_changed':
    case 'member.deactivated':
      return { icon: <Users />, variant: 'compact', line: <>{who} changed a team member’s access</> }
    default:
      return { icon: <Sparkles />, variant: 'compact', line: <>{who} — {item.type}</> }
  }
}

function stageChangeLine({ p, who, job, view }: Parts) {
  return (
    <>
      {who} {p.kind === 'ADMIN_MAPPING' ? 'remapped' : 'moved'}{job || ' this job'} {p.fromStageId ? <>from {view.stageLabel(p.fromStageId)} </> : null}to <strong>{view.stageLabel(p.toStageId)}</strong>
    </>
  )
}

function fieldChangesLine({ p, who, job, view }: Parts, fieldLabel: (id: string) => string) {
  return (
    <>
      {who} updated {(p.changes ?? []).map((c: { fieldId: string; to: unknown }, i: number) => (
        <span key={c.fieldId}>
          {i ? ', ' : ''}
          <strong>{fieldLabel(c.fieldId)}</strong>
          {formatChange(view, c.fieldId, c.to)}
        </span>
      ))}
      {job}
    </>
  )
}

const APPOINTMENT_VERBS: Record<string, string> = {
  'appointment.scheduled': 'scheduled',
  'appointment.rescheduled': 'rescheduled',
  'appointment.completed': 'completed',
  'appointment.canceled': 'canceled',
  'appointment.no_show': 'marked a no-show for',
  'appointment.updated': 'updated',
}

function appointmentLine({ item, p, who, job }: Parts) {
  const when = p.startsAt && item.type !== 'appointment.completed' ? <> for <strong>{dateTime(p.startsAt)}</strong></> : null
  return <>{who} {APPOINTMENT_VERBS[item.type]} {p.kind === 'inspection' ? 'the inspection' : 'an appointment'}{when}{job}</>
}

function financeLine({ item, p, who, job }: Parts) {
  return (
    <>
      {who} {item.type.endsWith('added') ? 'added' : 'updated'} <strong>{p.label}</strong>
      {p.amountCents ? <> · {money(p.amountCents)}</> : null}
      {p.statusLabel ? <> · {p.statusLabel}</> : null} <Badge tone="outline">Manual · unverified</Badge>
      {job}
    </>
  )
}

function describeEmail({ item, who, job }: Parts): Description {
  const m = item.message
  const failed = m?.status === 'FAILED' || m?.status === 'BOUNCED'
  return {
    icon: failed ? <AlertTriangle /> : <Mail />,
    variant: failed ? 'attention' : 'compact',
    line: <>{who} {item.type === 'review.requested' ? 'requested a review' : 'sent an email'}{job}</>,
    content: m ? <MessageCard message={m} /> : null,
  }
}

function describeRecognition({ item, who }: Parts): Description {
  const rec = item.recognition
  return {
    icon: <Award />,
    variant: 'rich',
    line: rec ? <>{who} recognized <Link className="link" to={`/u/${rec.recipient.slug}`}><strong>{rec.recipient.displayName}</strong></Link></> : who,
    content: rec ? (
      <div className="recognition">
        <span className="recognition__emoji" aria-hidden>{rec.type.emoji}</span>
        <div className="stack gap-1">
          <span className="text text--sm text--strong">{rec.type.label}</span>
          {rec.note ? <span className="text text--sm text--secondary">{rec.note}</span> : null}
        </div>
      </div>
    ) : null,
    hideNote: true,
  }
}

function importLine({ p, who }: Parts) {
  return (
    <>
      {who} imported <strong>{p.fileName}</strong>: {p.created} new, {p.linked} linked{p.duplicatesFlagged ? <>, <Link className="link" to="/contacts/review">{p.duplicatesFlagged} to review</Link></> : null}{p.errors ? <>, {p.errors} rows skipped</> : null}
    </>
  )
}

function formatChange(view: WorkflowView, fieldId: string, to: unknown) {
  const f = view.field(fieldId)
  if (!f || to === null || to === undefined || to === '') return ' cleared'
  if (f.type === 'select') return <> → {view.optionLabel(fieldId, to as string)}</>
  if (f.type === 'money') return <> → {money(to as number)}</>
  if (f.type === 'textarea') return null
  if (f.type === 'datetime') return <> → {dateTime(to as string)}</>
  if (typeof to === 'string' && to.length < 60) return <> → {to}</>
  return null
}

function OwnerName({ id }: { id: string }) {
  const { me } = useSession()
  return (
    <strong>
      {id === me?.id ? (
        me?.slug ? (
          <Link to={`/u/${me.slug}`} className="link">
            you
          </Link>
        ) : (
          'you'
        )
      ) : (
        <MemberName id={id} />
      )}
    </strong>
  )
}

function MemberName({ id }: { id: string }) {
  const members = useMembers()
  const member = members.data?.find((m) => m.userId === id)
  if (!member) return <>a teammate</>
  return (
    <Link to={`/u/${member.slug}`} className="link text--strong">
      {member.displayName}
    </Link>
  )
}

/** Queued → sent → delivered/failed shown on one item; raw provider events stay on the message. */
function MessageCard({ message: m }: { message: NonNullable<Item['message']> }) {
  const retry = useRetryMessage()
  return (
    <div className="activity-item__message">
      <div className="row row--between gap-2">
        <span className="text text--sm text--medium text--truncate">{m.subject}</span>
        <Badge tone={messageStatusTone(m.status)}>{messageStatusLabel(m.status)}</Badge>
      </div>
      <span className="text text--xs text--muted">
        To {m.toName ? `${m.toName} <${m.toEmail}>` : m.toEmail}
        {m.provider === 'DEV_LOG' ? ' · development transport (simulated delivery)' : ''}
      </span>
      {m.lastError && (m.status === 'FAILED' || m.status === 'BOUNCED') ? <span className="text text--xs text--danger">{m.lastError}</span> : null}
      {m.status === 'FAILED' ? (
        <div>
          <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(m.id, { onSuccess: () => toast.success('Queued again'), onError: (e) => toast.error(e) })}>
            Retry send
          </Button>
        </div>
      ) : null}
    </div>
  )
}
