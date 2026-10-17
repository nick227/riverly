import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Pencil } from 'lucide-react'
import type { ActivityItem as Item } from '@project/sdk'
import { useComments, useCorrectActivity, useCreateComment, useDeletePost, useToggleReaction } from '@project/sdk'
import { Button, Input, Select } from '@/components/primitives/Controls'
import { AttachmentGrid } from '@/components/patterns/Attachments'
import { Avatar } from '@/components/patterns/Avatar'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateTime, relative } from '@/lib/format'
import { useSession } from '@/lib/session'
import { verificationLabel } from '../config/labels'
import type { WorkflowView } from '../config/workflow'
import { describeActivity } from './activityDescription'

const REACTIONS = [
  { code: 'thumbs_up', emoji: '👍' },
  { code: 'heart', emoji: '❤️' },
  { code: 'clap', emoji: '👏' },
  { code: 'fire', emoji: '🔥' },
] as const

const CORRECTABLE_TYPES = ['contact.attempt', 'note.added', 'progress.updated']

/** One renderer for every event type, chosen from structured type + payload — no per-type pages. */
export function ActivityItem({ item, view, showSubject = true, timezone }: { item: Item; view: WorkflowView; showSubject?: boolean; timezone?: string }) {
  const r = describeActivity(item, { view, showSubject })
  const [commenting, setCommenting] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const { me, can } = useSession()
  // Authors manage their own entries; managers (jobs.assign_any) can manage anyone's.
  const canManage = item.actor?.id === me?.id || can('jobs.assign_any')
  const social = item.category === 'TEAM' || item.type === 'file.uploaded'
  const correctable = item.actorType === 'USER' && CORRECTABLE_TYPES.includes(item.type) && canManage

  return (
    <article className={cx('activity-item', r.variant === 'rich' && 'activity-item--rich', r.variant === 'attention' && 'activity-item--attention')}>
      {item.actor && item.category === 'TEAM' ? (
        item.actor.slug ? (
          <Link to={`/u/${item.actor.slug}`} aria-label={item.actor.displayName}>
            <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size="sm" />
          </Link>
        ) : (
          <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size="sm" />
        )
      ) : (
        <span className="activity-item__icon">{r.icon}</span>
      )}
      <div className="activity-item__body">
        <div className="row row--between">
          <p className="activity-item__line">{r.line}</p>
            <Button size="sm" variant="ghost" onClick={() => setCorrecting(true)}>
              <Pencil aria-hidden />
            </Button>

        </div>
        {r.content}
        {item.note && !r.hideNote ? <p className="activity-item__note">{item.note}</p> : null}
        {item.attachments.length ? <AttachmentGrid items={item.attachments} limit={6} /> : null}
        <ActivityMeta item={item} view={view} showSubject={showSubject} timezone={timezone} />
        {social || item.reactions.length || item.commentCount ? (
          <div className="activity-item__actions">
            <Reactions item={item} />
            <button type="button" className="reaction" onClick={() => setCommenting(!commenting)} aria-expanded={commenting}>
              <MessageCircle size={13} aria-hidden /> {item.commentCount || 'Comment'}
            </button>
            {item.post && !item.post.deleted && canManage ? <DeletePost postId={item.post.id} /> : null}
          </div>
        ) : null}
        {correcting ? <CorrectionForm item={item} view={view} onDone={() => setCorrecting(false)} /> : null}
        {commenting ? <Comments eventId={item.id} /> : null}
      </div>
    </article>
  )
}

function ActivityMeta({ item, view, showSubject, timezone }: { item: Item; view: WorkflowView; showSubject: boolean; timezone?: string }) {
  return (
    <div className="activity-item__meta">
      <time dateTime={item.occurredAt} title={`Recorded ${dateTime(item.recordedAt, timezone)}`}>
        {relative(item.occurredAt)}
      </time>
      {item.stageId ? <span>{view.stageLabel(item.stageId)}</span> : null}
      {showSubject ? <SubjectLink item={item} /> : null}
      {item.verification === 'SELF_REPORTED' ? <span title="Entered by a person; not confirmed by a phone or email provider">{verificationLabel(item.verification)}</span> : null}
      {item.revisionOfId ? <span>Correction</span> : null}
    </div>
  )
}

/** Links to the job (and its stage) when there is one, otherwise to the contact. */
function SubjectLink({ item }: { item: Item }) {
  if (item.opportunity)
    return (
      <Link className="link" to={`/jobs/${item.opportunity.id}${item.stageId ? `?stage=${item.stageId}` : ''}`}>
        {item.contact?.label ? `${item.contact.label} · ` : ''}
        {item.opportunity.label}
      </Link>
    )
  if (item.contact)
    return (
      <Link className="link" to={`/contacts/${item.contact.id}`}>
        {item.contact.label}
      </Link>
    )
  return null
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
          {c.author.slug ? (
            <Link to={`/u/${c.author.slug}`} aria-label={c.author.displayName}>
              <Avatar name={c.author.displayName} src={c.author.avatarUrl} size="sm" />
            </Link>
          ) : (
            <Avatar name={c.author.displayName} src={c.author.avatarUrl} size="sm" />
          )}
          <div className="stack gap-1">
            <span className="text text--xs">
              {c.author.slug ? (
                <Link to={`/u/${c.author.slug}`} className="link text--strong">
                  {c.author.displayName}
                </Link>
              ) : (
                <strong>{c.author.displayName}</strong>
              )}{' '}
              <span className="text--muted">{relative(c.createdAt)}</span>
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
