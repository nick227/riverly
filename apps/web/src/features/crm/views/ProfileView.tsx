import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, Gift, Pencil } from 'lucide-react'
import { useGiveRecognition, useProfile, useRecognitionTypes, useUpdateMyProfile } from '@project/sdk'
import { Button, Input, Textarea } from '@/components/primitives/Controls'
import { Avatar } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Segmented } from '@/components/patterns/Segmented'
import { EmptyState, ErrorState, PageState } from '@/components/patterns/States'
import { Stat } from '@/components/patterns/Stat'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateOnly, relative } from '@/lib/format'
import { useEntityTitle } from '@/lib/pageTitle'
import { useSession } from '@/lib/session'
import { ActivityItem } from '../components/ActivityItem'
import { roleLabel } from '../config/labels'
import { useWorkflowView } from '../config/workflow'

function getItemCategory(t: { key: string; category?: string }): 'cheer' | 'gift' | 'award' {
  if (t.category === 'cheer' || t.category === 'gift' || t.category === 'award') return t.category
  if (t.key.startsWith('cheer') || t.key === 'thank_you') return 'cheer'
  if (t.key.startsWith('award')) return 'award'
  return 'gift'
}

/** Internal profile: identity, recognition, assigned work and team highlights. */
export default function ProfileView() {
  const { slug = '' } = useParams()
  const profile = useProfile(slug)
  const typesQuery = useRecognitionTypes()
  const give = useGiveRecognition()
  const { view } = useWorkflowView()
  const { org } = useSession()

  const [editing, setEditing] = useState(false)
  const [recognizeModalOpen, setRecognizeModalOpen] = useState(false)
  const [sendingCheerId, setSendingCheerId] = useState<string | null>(null)

  const user = profile.data?.user
  const userRole = profile.data?.role
  useEntityTitle(
    {
      type: 'profile',
      name: user?.displayName,
      context: userRole ? roleLabel(userRole) : 'Team Member',
      description: user
        ? `Team member profile for ${user.displayName} (${userRole ? roleLabel(userRole) : 'Team Member'}). Recognition badges, active assignments, and recent highlights in Riverly CRM.`
        : null,
    },
    [user?.displayName, userRole],
  )

  if (profile.isLoading || !view) return <PageState />
  if (profile.error || !profile.data)
    return (
      <div className="crm-page">
        <ErrorState error={profile.error} />
      </div>
    )
  const p = profile.data

  const allTypes = typesQuery.data ?? []
  const cheers = allTypes.filter((t) => getItemCategory(t) === 'cheer')

  const handleQuickCheer = (cheer: { id: string; label: string; emoji: string }) => {
    setSendingCheerId(cheer.id)
    give.mutate(
      { recipientUserId: p.user.id, typeId: cheer.id, note: null },
      {
        onSuccess: () => {
          toast.success(`Sent ${cheer.emoji} ${cheer.label} to ${p.user.displayName}!`)
          setSendingCheerId(null)
        },
        onError: (err) => {
          toast.error(err)
          setSendingCheerId(null)
        },
      },
    )
  }

  return (
    <main className="crm-page crm-profile">
      {/* 1. Hero Identity & Teammate Recognition Bar */}
      <section className="crm-profile__hero-card">
        <div className="crm-profile__hero-main">
          <Avatar name={p.user.displayName} src={p.user.avatarUrl} size="xl" />
          <div className="stack gap-2 grow">
            <div className="row row--wrap gap-2 items-center">
              <h1 className="crm-profile__name">{p.user.displayName}</h1>
              <Badge tone="accent">{roleLabel(p.role)}</Badge>
            </div>
            <div className="row row--wrap gap-2 text text--sm text--muted">
              {p.user.title ? <span>{p.user.title} ·</span> : null}
              <span>{org?.name}</span>
              <span>· Member since {dateOnly(p.memberSince)}</span>
            </div>
            {p.bio ? (
              <p className="crm-profile__bio">{p.bio}</p>
            ) : p.isSelf ? (
              <p className="text text--sm text--muted">Add a short bio so teammates know what you do best.</p>
            ) : null}
          </div>
          <div className="crm-profile__hero-actions">
            {p.isSelf ? (
              <Button onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit profile
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setRecognizeModalOpen(true)}>
                <Gift aria-hidden /> Send gift or award
              </Button>
            )}
          </div>
        </div>

        {/* 1-Click Cheer Ribbon (Teammates only) */}
        {!p.isSelf && (
          <div className="crm-profile__quick-cheer">
            <div className="crm-profile__quick-cheer-header">
              <span className="text text--xs text--strong text--muted uppercase">Recognize {p.user.displayName}</span>
              <span className="text text--xs text--muted">Click to cheer instantly, or open the gift & award picker</span>
            </div>
            <div className="crm-profile__quick-cheer-pills">
              {cheers.map((c) => {
                const isSending = sendingCheerId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="crm-cheer-pill"
                    disabled={give.isPending}
                    onClick={() => handleQuickCheer(c)}
                    title={`Send ${c.label} instantly`}
                  >
                    <span className="crm-cheer-pill__emoji" aria-hidden>
                      {c.emoji}
                    </span>
                    <span className="crm-cheer-pill__label">{isSending ? 'Sending…' : c.label}</span>
                  </button>
                )
              })}
              <button
                type="button"
                className="crm-cheer-pill crm-cheer-pill--more"
                onClick={() => setRecognizeModalOpen(true)}
              >
                <Gift size={16} aria-hidden />
                <span>Gift or Award…</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Key Metrics Snapshot */}
      <section className="crm-profile__stats" aria-label="Work snapshot">
        <Stat value={p.stats.openJobs} label={`Open ${view.terms.opportunity.toLowerCase()}s`} />
        <Stat value={p.stats.jobsCompleted} label={`Completed ${view.terms.opportunity.toLowerCase()}s`} />
        <Stat value={p.stats.contactAttempts30d} label="Contact attempts (30d)" />
        <Stat value={p.stats.recognitionCount} label="Recognitions received" />
      </section>

      {/* 3. Main Content: Recognition & Awards Shelf, followed by Activity & Highlights */}
      <div className="stack gap-6">
        {/* Recognition & Awards Shelf */}
        <Card>
          <CardHeader
            title={
              <div className="row gap-2 items-center">
                <Award size={18} aria-hidden />
                <span>Recognition & Awards</span>
                {p.recognitions.length ? <Badge tone="neutral">{p.recognitions.length}</Badge> : null}
              </div>
            }
            actions={
              !p.isSelf ? (
                <Button size="sm" variant="secondary" onClick={() => setRecognizeModalOpen(true)}>
                  <Gift size={14} aria-hidden /> Send recognition
                </Button>
              ) : undefined
            }
          />
          {p.recognitions.length ? (
            <div className="recognition-shelf">
              {p.recognitions.map((r) => (
                <div key={r.id} className="recognition-card">
                  <div className="recognition-card__top">
                    <span className="recognition-card__emoji" aria-hidden>
                      {r.type.emoji}
                    </span>
                    <div className="recognition-card__info">
                      <div className="recognition-card__label-row">
                        <span className="recognition-card__label">{r.type.label}</span>
                      </div>
                      <div className="row items-center gap-1 text text--xs text--muted">
                        <span>from</span>
                        <Link className="link text--strong" to={`/u/${r.giver.slug}`}>
                          {r.giver.displayName}
                        </Link>
                        <span>·</span>
                        <time dateTime={r.createdAt} title={dateOnly(r.createdAt) ?? undefined}>
                          {relative(r.createdAt)}
                        </time>
                      </div>
                    </div>
                  </div>
                  {r.note ? <p className="recognition-card__note">“{r.note}”</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="No recognition yet"
              action={
                !p.isSelf ? (
                  <Button size="sm" onClick={() => setRecognizeModalOpen(true)}>
                    <Gift size={14} aria-hidden /> Be the first to recognize {p.user.displayName}
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>

        {/* Activity Highlights */}
        <Card>
          <CardHeader title="Activity & Highlights" />
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
      {recognizeModalOpen ? (
        <RecognizeModal
          recipientId={p.user.id}
          name={p.user.displayName}
          onClose={() => setRecognizeModalOpen(false)}
        />
      ) : null}
    </main>
  )
}

function EditProfile({
  profile,
  onClose,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>
  onClose: () => void
}) {
  const update = useUpdateMyProfile()
  const navigate = useNavigate()
  const [v, setV] = useState({
    displayName: profile.user.displayName,
    slug: profile.user.slug,
    title: profile.user.title ?? '',
    bio: profile.bio ?? '',
    avatarUrl: profile.user.avatarUrl ?? '',
  })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [k]: e.target.value })
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
                {
                  displayName: v.displayName,
                  slug: v.slug,
                  title: v.title || null,
                  bio: v.bio || null,
                  avatarUrl: v.avatarUrl || null,
                },
                {
                  onSuccess: () => (
                    toast.success('Profile saved'), onClose(), navigate(`/u/${v.slug}`, { replace: true })
                  ),
                  onError: (e) => toast.error(e),
                },
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label="Name">
          {(id) => <Input id={id} value={v.displayName} onChange={set('displayName')} autoFocus />}
        </Field>
        <Field label="Profile URL" hint={`/u/${v.slug}`}>
          {(id) => (
            <Input
              id={id}
              value={v.slug}
              onChange={(e) =>
                setV({ ...v, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
              }
            />
          )}
        </Field>
        <Field label="Title">
          {(id) => <Input id={id} value={v.title} onChange={set('title')} placeholder="Salesperson, Project manager…" />}
        </Field>
        <Field label="Bio">
          {(id) => <Textarea id={id} rows={3} value={v.bio} onChange={set('bio')} maxLength={500} />}
        </Field>
        <Field label="Photo URL">
          {(id) => (
            <Input id={id} type="url" value={v.avatarUrl} onChange={set('avatarUrl')} placeholder="https://" />
          )}
        </Field>
      </div>
    </Overlay>
  )
}

function RecognizeModal({
  recipientId,
  name,
  onClose,
}: {
  recipientId: string
  name: string
  onClose: () => void
}) {
  const types = useRecognitionTypes()
  const give = useGiveRecognition()
  const allTypes = types.data ?? []

  const gifts = allTypes.filter((t) => getItemCategory(t) === 'gift')
  const awards = allTypes.filter((t) => getItemCategory(t) === 'award')
  const cheers = allTypes.filter((t) => getItemCategory(t) === 'cheer')

  const [category, setCategory] = useState<'gifts' | 'awards' | 'cheers'>('gifts')
  const [selectedId, setSelectedId] = useState('')
  const [note, setNote] = useState('')

  const currentList = category === 'gifts' ? gifts : category === 'awards' ? awards : cheers
  const selectedType = allTypes.find((t) => t.id === selectedId)

  // Auto-select first item when category changes if needed
  const handleCategoryChange = (nextCat: 'gifts' | 'awards' | 'cheers') => {
    setCategory(nextCat)
    const list = nextCat === 'gifts' ? gifts : nextCat === 'awards' ? awards : cheers
    const first = list[0]
    if (first && !list.some((i) => i.id === selectedId)) {
      setSelectedId(first.id)
    }
  }

  // Initial selection
  useEffect(() => {
    const firstGift = gifts[0]
    if (!selectedId && firstGift) {
      setSelectedId(firstGift.id)
    }
  }, [gifts, selectedId])

  return (
    <Overlay
      open
      onRequestClose={onClose}
      title={`Recognize ${name}`}
      footer={
        <>
          <span className="text text--xs text--muted">Shown on {name}’s profile and in company Activity.</span>
          <Button
            variant="primary"
            disabled={!selectedId}
            loading={give.isPending}
            onClick={() =>
              give.mutate(
                { recipientUserId: recipientId, typeId: selectedId, note: note.trim() || null },
                {
                  onSuccess: () => {
                    toast.success(
                      `Sent ${selectedType?.emoji ?? '✨'} ${selectedType?.label ?? 'recognition'} to ${name}!`,
                    )
                    onClose()
                  },
                  onError: (e) => toast.error(e),
                },
              )
            }
          >
            {selectedType ? `Send ${selectedType.label}` : 'Send recognition'}
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Segmented
          label="Recognition category"
          value={category}
          onChange={handleCategoryChange}
          options={[
            { value: 'gifts', label: 'Gifts', count: gifts.length },
            { value: 'awards', label: 'Awards', count: awards.length },
            { value: 'cheers', label: 'Cheers', count: cheers.length },
          ]}
        />

        <div className="crm-picker-grid" role="radiogroup" aria-label="Recognition item">
          {currentList.map((t) => {
            const isSelected = t.id === selectedId
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={cx('crm-picker-item', isSelected && 'is-selected')}
                onClick={() => setSelectedId(t.id)}
              >
                <span className="crm-picker-item__emoji" aria-hidden>
                  {t.emoji}
                </span>
                <span className="crm-picker-item__label">{t.label}</span>
              </button>
            )
          })}
        </div>

        <Field
          label="Note (optional)"
          hint={
            category === 'awards'
              ? 'Say a few words about their achievement'
              : 'Add a personal note to accompany your recognition'
          }
        >
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`What did ${name} do? (optional)`}
              maxLength={500}
            />
          )}
        </Field>
      </div>
    </Overlay>
  )
}
