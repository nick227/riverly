import { useState, type ReactNode } from 'react'
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
import { useComments, useCorrectActivity, useCreateComment, useDeletePost, useRetryMessage, useToggleReaction } from '@project/sdk'
import { Button, Input, Select } from '@/components/primitives/Controls'
import { AttachmentGrid } from '@/components/patterns/Attachments'
import { Avatar } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateTime, money, relative } from '@/lib/format'
import { useSession } from '@/lib/session'
import { messageStatusLabel, messageStatusTone, statusLabel, verificationLabel } from '../config/labels'
import type { WorkflowView } from '../config/workflow'
import { useMemberName } from './MemberSelect'

const REACTIONS = [
  { code: 'thumbs_up', emoji: '👍' },
  { code: 'heart', emoji: '❤️' },
  { code: 'clap', emoji: '👏' },
  { code: 'fire', emoji: '🔥' },
] as const

type Variant = 'compact' | 'rich' | 'attention'
type Ctx = { view: WorkflowView; showSubject: boolean; timezone?: string }

/** One renderer for every event type, chosen from structured type + payload — no per-type pages. */
export function ActivityItem({ item, view, showSubject = true, timezone }: { item: Item; view: WorkflowView; showSubject?: boolean; timezone?: string }) {
  const ctx: Ctx = { view, showSubject, timezone }
  const r = describe(item, ctx)
  const [commenting, setCommenting] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const { me, can } = useSession()
  const social = item.category === 'TEAM' || item.type === 'file.uploaded'
  const correctable = item.actorType === 'USER' && ['contact.attempt', 'note.added', 'progress.updated'].includes(item.type) && (item.actor?.id === me?.id || can('jobs.assign_any'))

  return (
    <article className={cx('activity-item', r.variant === 'rich' && 'activity-item--rich', r.variant === 'attention' && 'activity-item--attention')}>
      {item.actor && item.category === 'TEAM' ? <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size="sm" /> : <span className="activity-item__icon">{r.icon}</span>}
      <div className="activity-item__body">
        <p className="activity-item__line">{r.line}</p>
        {r.content}
        {item.note && !r.hideNote ? <p className="activity-item__note">{item.note}</p> : null}
        {item.attachments.length ? <AttachmentGrid items={item.attachments} limit={6} /> : null}
        <div className="activity-item__meta">
          <time dateTime={item.occurredAt} title={`Recorded ${dateTime(item.recordedAt, timezone)}`}>
            {relative(item.occurredAt)}
          </time>
          {item.stageId ? <span>{view.stageLabel(item.stageId)}</span> : null}
          {showSubject && item.opportunity ? (
            <Link className="link" to={`/jobs/${item.opportunity.id}${item.stageId ? `?stage=${item.stageId}` : ''}`}>
              {item.contact?.label ? `${item.contact.label} · ` : ''}
              {item.opportunity.label}
            </Link>
          ) : showSubject && item.contact ? (
            <Link className="link" to={`/contacts/${item.contact.id}`}>
              {item.contact.label}
            </Link>
          ) : null}
          {item.verification === 'SELF_REPORTED' ? <span title="Entered by a person; not confirmed by a phone or email provider">{verificationLabel(item.verification)}</span> : null}
          {item.revisionOfId ? <span>Correction</span> : null}
        </div>
        {social || item.reactions.length || item.commentCount ? (
          <div className="activity-item__actions">
            <Reactions item={item} />
            <button type="button" className="reaction" onClick={() => setCommenting(!commenting)} aria-expanded={commenting}>
              <MessageCircle size={13} aria-hidden /> {item.commentCount || 'Comment'}
            </button>
            {item.post && !item.post.deleted && (item.actor?.id === me?.id || can('jobs.assign_any')) ? <DeletePost postId={item.post.id} /> : null}
          </div>
        ) : null}
        {correctable && !correcting ? (
          <div>
            <Button size="sm" variant="ghost" onClick={() => setCorrecting(true)}>
              <Pencil aria-hidden /> Correct
            </Button>
          </div>
        ) : null}
        {correcting ? <CorrectionForm item={item} view={view} onDone={() => setCorrecting(false)} /> : null}
        {commenting ? <Comments eventId={item.id} /> : null}
      </div>
    </article>
  )
}

function describe(item: Item, { view, showSubject }: Ctx): { icon: ReactNode; line: ReactNode; content?: ReactNode; variant: Variant; hideNote?: boolean } {
  const who = item.actor ? <strong>{item.actor.displayName}</strong> : <strong>{item.actorLabel ?? 'Riverly'}</strong>
  const p = (item.payload ?? {}) as Record<string, any>
  const job = showSubject && item.opportunity ? <> on <strong>{item.opportunity.label}</strong></> : null
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
      return {
        icon: <ArrowRightLeft />,
        variant: 'rich',
        line: (
          <>
            {who} {p.kind === 'ADMIN_MAPPING' ? 'remapped' : 'moved'}{job || ' this job'} {p.fromStageId ? <>from {view.stageLabel(p.fromStageId)} </> : null}to <strong>{view.stageLabel(p.toStageId)}</strong>
          </>
        ),
      }
    case 'status.changed':
      return { icon: <ArrowRightLeft />, variant: 'compact', line: <>{who} marked{job || ' this job'} <strong>{statusLabel(p.toStatus)}</strong></> }
    case 'assignment.changed':
      return { icon: <UserPlus />, variant: 'compact', line: p.toOwnerId ? <>{who} assigned{job || ' this job'} to <OwnerName id={p.toOwnerId} /></> : <>{who} unassigned{job || ' this job'}</> }
    case 'job.updated':
    case 'field.changed':
      return {
        icon: <Pencil />,
        variant: 'compact',
        line: (
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
        ),
      }
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
    case 'appointment.updated': {
      const verb = { 'appointment.scheduled': 'scheduled', 'appointment.rescheduled': 'rescheduled', 'appointment.completed': 'completed', 'appointment.canceled': 'canceled', 'appointment.no_show': 'marked a no-show for', 'appointment.updated': 'updated' }[item.type]
      return { icon: <CalendarClock />, variant: 'compact', line: <>{who} {verb} {p.kind === 'inspection' ? 'the inspection' : 'an appointment'}{p.startsAt && item.type !== 'appointment.completed' ? <> for <strong>{dateTime(p.startsAt)}</strong></> : null}{job}</> }
    }
    case 'participant.added':
      return { icon: <Users />, variant: 'compact', line: <>{who} added {p.name ?? 'a team member'} as {p.roleKey}{job}</> }
    case 'participant.removed':
      return { icon: <Users />, variant: 'compact', line: <>{who} removed a {p.roleKey}{job}</> }
    case 'finance.reference_added':
    case 'finance.reference_updated':
      return {
        icon: <DollarSign />,
        variant: 'compact',
        line: (
          <>
            {who} {item.type.endsWith('added') ? 'added' : 'updated'} <strong>{p.label}</strong>
            {p.amountCents ? <> · {money(p.amountCents)}</> : null}
            {p.statusLabel ? <> · {p.statusLabel}</> : null} <Badge tone="outline">Manual · unverified</Badge>
            {job}
          </>
        ),
      }
    case 'email.message':
    case 'review.requested': {
      const m = item.message
      const failed = m?.status === 'FAILED' || m?.status === 'BOUNCED'
      return {
        icon: failed ? <AlertTriangle /> : <Mail />,
        variant: failed ? 'attention' : 'compact',
        line: <>{who} {item.type === 'review.requested' ? 'requested a review' : 'sent an email'}{job}</>,
        content: m ? <MessageCard message={m} /> : null,
      }
    }
    case 'post.created':
      return {
        icon: <MessageCircle />,
        variant: 'rich',
        line: <>{who}{job ? <> posted{job}</> : null}</>,
        content: item.post?.deleted ? <p className="text text--sm text--muted">This post was removed.</p> : <p className="activity-item__note">{item.post?.body}</p>,
      }
    case 'recognition.given': {
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
    case 'import.completed':
      return {
        icon: <Inbox />,
        variant: p.duplicatesFlagged || p.errors ? 'attention' : 'compact',
        line: (
          <>
            {who} imported <strong>{p.fileName}</strong>: {p.created} new, {p.linked} linked{p.duplicatesFlagged ? <>, <Link className="link" to="/contacts/review">{p.duplicatesFlagged} to review</Link></> : null}{p.errors ? <>, {p.errors} rows skipped</> : null}
          </>
        ),
      }
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
  return <strong>{id === me?.id ? 'you' : <MemberName id={id} />}</strong>
}

function MemberName({ id }: { id: string }) {
  const name = useMemberName()
  return <>{name(id) ?? 'a teammate'}</>
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

function Reactions({ item }: { item: Item }) {
  const toggle = useToggleReaction(item.id)
  const counts = new Map(item.reactions.map((r) => [r.code, r]))
  return (
    <>
      {REACTIONS.map((r) => {
        const c = counts.get(r.code)
        if (!c && !['thumbs_up', 'heart'].includes(r.code)) return null
        return (
          <button key={r.code} type="button" className={cx('reaction', c?.mine && 'is-mine')} aria-pressed={!!c?.mine} aria-label={`React ${r.code.replace('_', ' ')}`} onClick={() => toggle.mutate(r.code, { onError: (e) => toast.error(e) })}>
            <span aria-hidden>{r.emoji}</span>
            {c ? c.count : null}
          </button>
        )
      })}
    </>
  )
}

function DeletePost({ postId }: { postId: string }) {
  const del = useDeletePost()
  return (
    <button type="button" className="reaction" onClick={() => del.mutate(postId, { onSuccess: () => toast.success('Post removed'), onError: (e) => toast.error(e) })}>
      Remove
    </button>
  )
}

function Comments({ eventId }: { eventId: string }) {
  const list = useComments(eventId, true)
  const add = useCreateComment(eventId)
  const [body, setBody] = useState('')
  return (
    <div className="comment-thread">
      {(list.data ?? []).map((c) => (
        <div key={c.id} className="row row--start gap-2">
          <Avatar name={c.author.displayName} src={c.author.avatarUrl} size="sm" />
          <div className="stack gap-1">
            <span className="text text--xs">
              <strong>{c.author.displayName}</strong> <span className="text--muted">{relative(c.createdAt)}</span>
            </span>
            <span className="text text--sm text--pre">{c.body}</span>
          </div>
        </div>
      ))}
      <form
        className="row gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add.mutate(body, { onSuccess: () => setBody(''), onError: (err) => toast.error(err) })
        }}
      >
        <Input size_="sm" aria-label="Write a comment" placeholder="Write a comment" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm" type="submit" disabled={!body.trim()} loading={add.isPending}>
          Reply
        </Button>
      </form>
    </div>
  )
}

function CorrectionForm({ item, view, onDone }: { item: Item; view: WorkflowView; onDone: () => void }) {
  const correct = useCorrectActivity()
  const [note, setNote] = useState('')
  const [outcomeId, setOutcomeId] = useState(item.outcomeId ?? '')
  return (
    <div className="card card--subtle stack gap-2">
      <span className="text text--xs text--muted">The original entry stays in history; your correction is added beside it.</span>
      {item.type === 'contact.attempt' ? (
        <Select size_="sm" aria-label="Correct outcome" value={outcomeId} onChange={(e) => setOutcomeId(e.target.value)} options={view.def.activity.outcomes.map((o) => ({ value: o.id, label: o.label }))} />
      ) : null}
      <Input size_="sm" aria-label="What changed" placeholder="What was wrong?" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <div className="action-bar">
        <Button
          size="sm"
          variant="primary"
          disabled={!note.trim()}
          loading={correct.isPending}
          onClick={() =>
            correct.mutate(
              { id: item.id, note, outcomeId: item.type === 'contact.attempt' ? outcomeId || null : null, methodId: item.methodId },
              { onSuccess: () => (toast.success('Correction added'), onDone()), onError: (e) => toast.error(e) },
            )
          }
        >
          Add correction
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
