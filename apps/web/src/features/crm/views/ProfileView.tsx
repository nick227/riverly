import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, Pencil } from 'lucide-react'
import { useGiveRecognition, useProfile, useRecognitionTypes, useUpdateMyProfile } from '@project/sdk'
import { Button, Input, Textarea } from '@/components/primitives/Controls'
import { Avatar } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { EmptyState, ErrorState, PageState } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateOnly } from '@/lib/format'
import { useSession } from '@/lib/session'
import { ActivityItem } from '../components/ActivityItem'
import { roleLabel } from '../config/labels'
import { useWorkflowView } from '../config/workflow'

/** Internal profile: identity, work snapshot, recognition and selected highlights. */
export default function ProfileView() {
  const { slug = '' } = useParams()
  const profile = useProfile(slug)
  const { view } = useWorkflowView()
  const { org } = useSession()
  const [editing, setEditing] = useState(false)
  const [recognizing, setRecognizing] = useState(false)

  if (profile.isLoading || !view) return <PageState />
  if (profile.error || !profile.data) return <div className="crm-page"><ErrorState error={profile.error} /></div>
  const p = profile.data

  return (
    <main className="crm-page crm-page--narrow crm-profile">
      <section className="crm-profile__hero">
        <Avatar name={p.user.displayName} src={p.user.avatarUrl} size="xl" />
        <div className="stack gap-2">
          <h1 className="crm-profile__name">{p.user.displayName}</h1>
          <span className="row row--wrap gap-2 text text--sm text--muted">
            {p.user.title ?? roleLabel(p.role)} · {org?.name} · since {dateOnly(p.memberSince)}
          </span>
          {p.bio ? <p className="crm-profile__bio">{p.bio}</p> : p.isSelf ? <p className="text text--sm text--muted">Add a short bio so teammates know what you do best.</p> : null}
        </div>
        <div className="action-bar">
          {p.isSelf ? (
            <Button onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Edit profile
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setRecognizing(true)}>
              <Award aria-hidden /> Recognize
            </Button>
          )}
        </div>
      </section>

      <section className="crm-profile__stats" aria-label="Work snapshot">
        <Stat value={p.stats.openJobs} label={`Open ${view.terms.opportunity.toLowerCase()}s`} />
        <Stat value={p.stats.jobsCompleted} label={`Reached ${view.active[view.active.length - 1]?.label ?? 'completion'}`} />
        <Stat value={p.stats.contactAttempts30d} label="Contact attempts (30 days)" />
        <Stat value={p.stats.recognitionCount} label="Recognitions" />
      </section>

      <div className="stack gap-6">
        <Card>
          <CardHeader title="Recognition" />
          {p.recognitions.length ? (
            <div className="recognition-shelf">
              {p.recognitions.map((r) => (
                <div key={r.id} className="recognition">
                  <span className="recognition__emoji" aria-hidden>{r.type.emoji}</span>
                  <div className="stack gap-1">
                    <span className="text text--sm text--strong">{r.type.label}</span>
                    {r.note ? <span className="text text--sm text--secondary">{r.note}</span> : null}
                    <span className="text text--xs text--muted">
                      from <Link className="link" to={`/u/${r.giver.slug}`}>{r.giver.displayName}</Link> · {dateOnly(r.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact title="No recognition yet" action={!p.isSelf ? <Button size="sm" onClick={() => setRecognizing(true)}>Be the first</Button> : undefined} />
          )}
        </Card>

        {p.assignedJobs.length ? (
          <Card>
            <CardHeader title={`Current ${view.terms.opportunity.toLowerCase()}s`} />
            <div className="list">
              {p.assignedJobs.map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="list__row list__row--link">
                  <span className="text text--sm text--medium grow text--truncate">
                    {j.contactName} · {j.title}
                  </span>
                  <Badge tone="outline">{view.stageLabel(j.stageId)}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Highlights" />
          {p.highlights.length ? (
            <div className="crm-activity__list">
              {p.highlights.map((h) => (
                <ActivityItem key={h.id} item={h} view={view} timezone={org?.timezone} />
              ))}
            </div>
          ) : (
            <EmptyState compact title="Highlights appear here as work and recognition happen." />
          )}
        </Card>
      </div>

      {editing ? <EditProfile profile={p} onClose={() => setEditing(false)} /> : null}
      {recognizing ? <Recognize recipientId={p.user.id} name={p.user.displayName} onClose={() => setRecognizing(false)} /> : null}
    </main>
  )
}

function EditProfile({ profile, onClose }: { profile: NonNullable<ReturnType<typeof useProfile>['data']>; onClose: () => void }) {
  const update = useUpdateMyProfile()
  const navigate = useNavigate()
  const [v, setV] = useState({ displayName: profile.user.displayName, slug: profile.user.slug, title: profile.user.title ?? '', bio: profile.bio ?? '', avatarUrl: profile.user.avatarUrl ?? '' })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <Overlay
      open
      onRequestClose={onClose}
      title="Edit profile"
      footer={
        <>
          <span className="text text--xs text--muted">Visible to people in your company only.</span>
          <Button
            variant="primary"
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { displayName: v.displayName, slug: v.slug, title: v.title || null, bio: v.bio || null, avatarUrl: v.avatarUrl || null },
                { onSuccess: () => (toast.success('Profile saved'), onClose(), navigate(`/u/${v.slug}`, { replace: true })), onError: (e) => toast.error(e) },
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label="Name">{(id) => <Input id={id} value={v.displayName} onChange={set('displayName')} autoFocus />}</Field>
        <Field label="Profile URL" hint={`/u/${v.slug}`}>{(id) => <Input id={id} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />}</Field>
        <Field label="Title">{(id) => <Input id={id} value={v.title} onChange={set('title')} placeholder="Salesperson, Project manager…" />}</Field>
        <Field label="Bio">{(id) => <Textarea id={id} rows={3} value={v.bio} onChange={set('bio')} maxLength={500} />}</Field>
        <Field label="Photo URL">{(id) => <Input id={id} type="url" value={v.avatarUrl} onChange={set('avatarUrl')} placeholder="https://" />}</Field>
      </div>
    </Overlay>
  )
}

function Recognize({ recipientId, name, onClose }: { recipientId: string; name: string; onClose: () => void }) {
  const types = useRecognitionTypes()
  const give = useGiveRecognition()
  const [typeId, setTypeId] = useState('')
  const [note, setNote] = useState('')
  return (
    <Overlay
      open
      onRequestClose={onClose}
      title={`Recognize ${name}`}
      footer={
        <>
          <span className="text text--xs text--muted">Shown on their profile and in Activity.</span>
          <Button
            variant="primary"
            disabled={!typeId}
            loading={give.isPending}
            onClick={() => give.mutate({ recipientUserId: recipientId, typeId, note: note || null }, { onSuccess: () => (toast.success('Recognition sent'), onClose()), onError: (e) => toast.error(e) })}
          >
            Send
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <div className="grid grid--auto gap-2" style={{ '--grid-min': '150px' } as React.CSSProperties} role="radiogroup" aria-label="Sticker">
          {(types.data ?? []).map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={t.id === typeId} className={cx('card card--compact card--interactive row gap-2', t.id === typeId && 'is-active')} style={t.id === typeId ? { borderColor: 'var(--color-accent)' } : undefined} onClick={() => setTypeId(t.id)}>
              <span aria-hidden style={{ fontSize: 20 }}>{t.emoji}</span>
              <span className="text text--sm">{t.label}</span>
            </button>
          ))}
        </div>
        <Field label="Note (optional)">{(id) => <Textarea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they do?" />}</Field>
      </div>
    </Overlay>
  )
}
