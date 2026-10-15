import { useRef, useState } from 'react'
import { CalendarClock, ExternalLink, MoreHorizontal, Plus, Star, Upload, X } from 'lucide-react'
import type { FieldDef } from '@project/sdk'
import {
  useActivity,
  useAddParticipant,
  useCreateAppointment,
  useCreateExternalPerson,
  useExternalPeople,
  useLogActivity,
  useRemoveAttachmentLink,
  useRemoveParticipant,
  useSaveExternalLink,
  useUpdateAppointment,
  useUploadAttachment,
} from '@project/sdk'
import { Button, IconButton, Input, Select, Textarea } from '@/components/primitives/Controls'
import { AttachmentGrid, FileChip } from '@/components/patterns/Attachments'
import { Badge } from '@/components/patterns/Badge'
import { Field } from '@/components/patterns/Field'
import { Identity } from '@/components/patterns/Avatar'
import { Menu, MenuItem } from '@/components/patterns/Menu'
import { Overlay } from '@/components/patterns/Overlay'
import { toast } from '@/components/patterns/Toast'
import { dateTime, dollarsToCents, fromLocalInput, money, relative, toLocalInput } from '@/lib/format'
import { messageStatusLabel, messageStatusTone } from '../config/labels'
import type { ControlContext } from './FieldControl'
import { MemberSelect } from './MemberSelect'

type Props = { field: FieldDef; ctx: ControlContext }

function ControlFrame({ field, children, action }: { field: FieldDef; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="field">
      <div className="row row--between gap-2">
        <span className="field__label">{field.label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

/** Repeatable contact attempts. Each log is its own self-reported event; the summary is derived. */
export function ContactLogControl({ field, ctx }: Props) {
  const log = useLogActivity(ctx.job.id)
  const [methodId, setMethodId] = useState(ctx.view.def.activity.methods[0]?.id ?? '')
  const [outcomeId, setOutcomeId] = useState('')
  const [note, setNote] = useState('')
  const summary = ctx.job.stageSummaries.find((s) => s.stageId === ctx.stageId)
  const save = () =>
    log.mutate(
      { kind: 'contact_attempt', stageId: ctx.stageId, methodId, outcomeId, note: note || null },
      {
        onSuccess: () => {
          setOutcomeId('')
          setNote('')
          toast.success('Attempt logged')
        },
        onError: (e) => toast.error(e),
      },
    )
  return (
    <ControlFrame field={field}>
      <span className="text text--sm text--secondary">
        {summary?.attemptCount
          ? `${summary.attemptCount} attempt${summary.attemptCount === 1 ? '' : 's'} · last ${ctx.view.outcomeLabel(summary.latestOutcomeId).toLowerCase()} by ${ctx.view.methodLabel(summary.latestMethodId).toLowerCase()} ${relative(summary.lastEventAt) ?? ''}`
          : 'No attempts logged'}
      </span>
      <div className="row row--wrap gap-2">
        <Select size_="sm" aria-label="Method" value={methodId} onChange={(e) => setMethodId(e.target.value)} options={ctx.view.def.activity.methods.filter((m) => !m.retired).map((m) => ({ value: m.id, label: m.label }))} style={{ flex: '1 1 110px' }} />
        <Select size_="sm" aria-label="Outcome" value={outcomeId} onChange={(e) => setOutcomeId(e.target.value)} placeholder="Outcome" options={ctx.view.def.activity.outcomes.filter((o) => !o.retired).map((o) => ({ value: o.id, label: o.label }))} style={{ flex: '1 1 140px' }} />
      </div>
      <div className="row gap-2">
        <Input size_="sm" aria-label="Attempt note" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="primary" onClick={save} loading={log.isPending} disabled={!methodId || !outcomeId}>
          Log
        </Button>
      </div>
    </ControlFrame>
  )
}

export function ProgressLogControl({ field, ctx }: Props) {
  const log = useLogActivity(ctx.job.id)
  const feed = useActivity({ opportunityId: ctx.job.id, stageId: ctx.stageId, limit: 20 })
  const latest = feed.data?.pages[0]?.data.find((e) => e.type === 'progress.updated')
  const [note, setNote] = useState('')
  return (
    <ControlFrame field={field}>
      {latest ? (
        <div className="stack gap-1">
          <span className="text text--sm text--pre">{latest.note}</span>
          <span className="text text--xs text--muted">
            {latest.actor?.displayName} · {relative(latest.occurredAt)}
          </span>
        </div>
      ) : (
        <span className="text text--sm text--muted">No updates yet</span>
      )}
      <div className="row gap-2">
        <Input size_="sm" aria-label="Progress update" placeholder="Add an update" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          size="sm"
          variant="secondary"
          disabled={!note.trim()}
          loading={log.isPending}
          onClick={() =>
            log.mutate({ kind: 'progress', stageId: ctx.stageId, note }, { onSuccess: () => (setNote(''), toast.success('Update posted')), onError: (e) => toast.error(e) })
          }
        >
          Post
        </Button>
      </div>
    </ControlFrame>
  )
}

export function AppointmentControl({ field, ctx }: Props) {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const update = useUpdateAppointment(ctx.job.id)
  const list = ctx.job.appointments.filter((a) => a.stageId === ctx.stageId)
  const upcoming = list.filter((a) => a.status === 'SCHEDULED').sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const shown = upcoming[0] ?? list[0]
  const setStatus = (id: string, status: 'COMPLETED' | 'CANCELED' | 'NO_SHOW') =>
    update.mutate({ id, status }, { onSuccess: () => toast.success('Appointment updated'), onError: (e) => toast.error(e) })
  return (
    <ControlFrame
      field={field}
      action={
        <Button size="sm" variant="ghost" onClick={() => setEditing('new')}>
          <CalendarClock aria-hidden /> Schedule
        </Button>
      }
    >
      {shown ? (
        <div className="row row--between gap-2">
          <div className="stack gap-1" style={{ minWidth: 0 }}>
            <span className="text text--sm text--medium">{dateTime(shown.startsAt, ctx.timezone)}</span>
            <span className="text text--xs text--muted text--truncate">
              {shown.externalPerson?.displayName ?? shown.assignee?.displayName ?? 'No one assigned'}
              {shown.externalPerson?.companyName ? ` · ${shown.externalPerson.companyName}` : ''}
            </span>
          </div>
          <div className="row gap-1">
            <Badge tone={shown.status === 'COMPLETED' ? 'success' : shown.status === 'SCHEDULED' ? 'outline' : 'warning'}>{shown.status.replace('_', ' ').toLowerCase()}</Badge>
            {shown.status === 'SCHEDULED' ? (
              <Menu label="Appointment actions" trigger={(p) => <IconButton label="Appointment actions" icon={<MoreHorizontal />} size="sm" {...p} />}>
                {(close) => (
                  <>
                    <MenuItem onSelect={() => (close(), setEditing(shown.id))}>Reschedule</MenuItem>
                    <MenuItem onSelect={() => (close(), setStatus(shown.id, 'COMPLETED'))}>Mark completed</MenuItem>
                    <MenuItem onSelect={() => (close(), setStatus(shown.id, 'NO_SHOW'))}>No-show</MenuItem>
                    <MenuItem onSelect={() => (close(), setStatus(shown.id, 'CANCELED'))}>Cancel</MenuItem>
                  </>
                )}
              </Menu>
            ) : null}
          </div>
        </div>
      ) : (
        <span className="text text--sm text--muted">Not scheduled</span>
      )}
      {editing ? <ScheduleOverlay ctx={ctx} appointmentId={editing === 'new' ? null : editing} kind={field.appointmentKind} onClose={() => setEditing(null)} /> : null}
    </ControlFrame>
  )
}

export function ScheduleOverlay({ ctx, appointmentId, kind, onClose }: { ctx: ControlContext; appointmentId: string | null; kind?: string; onClose: () => void }) {
  const existing = ctx.job.appointments.find((a) => a.id === appointmentId)
  const update = useUpdateAppointment(ctx.job.id)
  const create = useCreateAppointment(ctx.job.id)
  const [startsAt, setStartsAt] = useState(toLocalInput(existing?.startsAt ?? null))
  const [who, setWho] = useState(existing?.externalPerson ? `ext:${existing.externalPerson.id}` : existing?.assignee ? `mem:${existing.assignee.id}` : '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [reason, setReason] = useState('')
  const people = useExternalPeople('')
  const pending = update.isPending || create.isPending

  function submit() {
    const assignee = who.startsWith('mem:') ? who.slice(4) : null
    const external = who.startsWith('ext:') ? who.slice(4) : null
    const iso = fromLocalInput(startsAt)
    if (!iso) return
    const done = { onSuccess: () => (toast.success(existing ? 'Appointment rescheduled' : 'Appointment scheduled'), onClose()), onError: (e: Error) => toast.error(e) }
    if (existing) update.mutate({ id: existing.id, startsAt: iso, assigneeUserId: assignee, externalPersonId: external, notes: notes || null, reason: reason || null }, done)
    else create.mutate({ stageId: ctx.stageId, kind, startsAt: iso, assigneeUserId: assignee, externalPersonId: external, notes: notes || null }, done)
  }

  return (
    <Overlay
      open
      onRequestClose={onClose}
      title={existing ? 'Reschedule' : 'Schedule appointment'}
      footer={
        <>
          <span className="text text--xs text--muted">Times are shown in your local timezone.</span>
          <div className="action-bar">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={pending} disabled={!startsAt}>
              {existing ? 'Save' : 'Schedule'}
            </Button>
          </div>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label="Date and time">{(id) => <Input id={id} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} autoFocus />}</Field>
        <Field label="Who is going" hint="Third-party inspectors are recorded without app access.">
          {(id) => (
            <Select
              id={id}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Not assigned yet"
              options={[
                ...(people.data ?? []).map((p) => ({ value: `ext:${p.id}`, label: `${p.displayName}${p.companyName ? ` — ${p.companyName}` : ''}` })),
                ...[ctx.job.owner].filter(Boolean).map((o) => ({ value: `mem:${o!.id}`, label: `${o!.displayName} (team)` })),
              ]}
            />
          )}
        </Field>
        <NewExternalPerson onCreated={(id) => setWho(`ext:${id}`)} />
        <Field label="Notes">{(id) => <Textarea id={id} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        {existing ? <Field label="Reason for change">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />}</Field> : null}
      </div>
    </Overlay>
  )
}

function NewExternalPerson({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const create = useCreateExternalPerson()
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>
        <Plus aria-hidden /> New inspector or crew
      </Button>
    )
  return (
    <div className="card card--subtle stack gap-3">
      <div className="grid grid--3 gap-2">
        <Input size_="sm" placeholder="Name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input size_="sm" placeholder="Company" aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        <Input size_="sm" placeholder="Phone" aria-label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="action-bar">
        <Button
          size="sm"
          variant="primary"
          disabled={!name.trim()}
          loading={create.isPending}
          onClick={() =>
            create.mutate(
              { displayName: name, companyName: company || null, phone: phone || null },
              { onSuccess: (p) => (onCreated(p.id), setOpen(false), toast.success(`${p.displayName} added`)), onError: (e) => toast.error(e) },
            )
          }
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function ParticipantsControl({ field, ctx }: Props) {
  const role = field.participantRole ?? field.id
  const add = useAddParticipant(ctx.job.id)
  const remove = useRemoveParticipant(ctx.job.id)
  const people = useExternalPeople('')
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState('')
  const list = ctx.job.participants.filter((p) => p.roleKey === role)
  const submit = (value = pick) => {
    if (!value) return
    const body = value.startsWith('mem:') ? { roleKey: role, stageId: ctx.stageId, memberUserId: value.slice(4) } : { roleKey: role, stageId: ctx.stageId, externalPersonId: value.slice(4) }
    add.mutate(body, { onSuccess: () => (setAdding(false), setPick(''), toast.success(`${field.label} added`)), onError: (e) => toast.error(e) })
  }
  return (
    <ControlFrame
      field={field}
      action={
        !adding ? (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add
          </Button>
        ) : null
      }
    >
      {list.length ? (
        <div className="stack gap-2">
          {list.map((p) => (
            <div key={p.id} className="row row--between gap-2">
              <Identity
                size="sm"
                name={p.member?.displayName ?? p.externalPerson?.displayName ?? '?'}
                src={p.member?.avatarUrl}
                secondary={p.member ? 'Team member' : [p.externalPerson?.companyName, p.externalPerson?.phone].filter(Boolean).join(' · ') || 'External'}
              />
              <IconButton size="sm" label={`Remove ${field.label}`} icon={<X />} onClick={() => remove.mutate(p.id, { onError: (e) => toast.error(e) })} />
            </div>
          ))}
        </div>
      ) : !adding ? (
        <span className="text text--sm text--muted">None yet</span>
      ) : null}
      {adding ? (
        <div className="stack gap-2">
          <div className="row gap-2">
            <Select
              size_="sm"
              aria-label={`Choose ${field.label}`}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              placeholder="Choose…"
              options={(people.data ?? []).map((p) => ({ value: `ext:${p.id}`, label: `${p.displayName}${p.companyName ? ` — ${p.companyName}` : ''}` }))}
            />
            <Button size="sm" variant="primary" onClick={() => submit()} disabled={!pick} loading={add.isPending}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
          <NewExternalPerson onCreated={(id) => submit(`ext:${id}`)} />
          <TeamMemberPick onPick={(id) => submit(`mem:${id}`)} />
        </div>
      ) : null}
    </ControlFrame>
  )
}

function TeamMemberPick({ onPick }: { onPick: (userId: string) => void }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="row gap-2">
      <MemberSelect value={value} onChange={setValue} placeholder="…or a team member" />
      <Button size="sm" variant="secondary" disabled={!value} onClick={() => value && onPick(value)}>
        Add
      </Button>
    </div>
  )
}

/** Files for a stage field: stored once, linked here, also visible in Activity and Full Record. */
export function AttachmentControl({ field, ctx }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAttachment({ opportunityId: ctx.job.id, fieldId: field.id, stageId: ctx.stageId })
  const remove = useRemoveAttachmentLink(ctx.job.id)
  const [showAll, setShowAll] = useState(false)
  const files = ctx.job.attachments.filter((a) => a.fieldId === field.id)
  const gallery = field.type === 'gallery'
  async function onFiles(list: FileList | null) {
    for (const file of Array.from(list ?? [])) {
      try {
        await upload.mutateAsync(file)
        toast.success(`${file.name} uploaded`)
      } catch (e) {
        toast.error(e)
      }
    }
    if (input.current) input.current.value = ''
  }
  return (
    <ControlFrame
      field={field}
      action={
        <>
          <input ref={input} type="file" hidden multiple={gallery} accept={gallery ? 'image/*' : undefined} onChange={(e) => void onFiles(e.target.files)} />
          <Button size="sm" variant="ghost" onClick={() => input.current?.click()} loading={upload.isPending}>
            <Upload aria-hidden /> Upload
          </Button>
        </>
      }
    >
      {files.length === 0 ? (
        <span className="text text--sm text--muted">{gallery ? 'No photos yet' : 'No file yet'}</span>
      ) : gallery ? (
        <AttachmentGrid items={files} limit={showAll ? undefined : 4} onMore={() => setShowAll(true)} />
      ) : (
        <div className="stack gap-2">
          {files.map((f) => (
            <div key={f.id} className="row gap-1">
              <FileChip file={f} />
              <IconButton size="sm" label={`Remove ${f.fileName}`} icon={<X />} onClick={() => remove.mutate(f.id, { onSuccess: () => toast.success('File removed from this job'), onError: (e) => toast.error(e) })} />
            </div>
          ))}
        </div>
      )}
    </ControlFrame>
  )
}

/** Company-owned invoice/payment links with manually entered status — clearly unverified. */
export function ExternalLinkControl({ field, ctx }: Props) {
  const kind = field.linkKind ?? 'OTHER'
  const save = useSaveExternalLink(ctx.job.id)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  // A payment field also tracks the invoice it settles.
  const kinds = kind === 'PAYMENT' ? ['PAYMENT', 'INVOICE'] : [kind]
  const list = ctx.job.externalLinks.filter((l) => kinds.includes(l.kind))
  const current = list.find((l) => l.id === editing)
  const [form, setForm] = useState({ label: '', url: '', amount: '', status: '' })
  const open = (id: string | 'new') => {
    const l = list.find((x) => x.id === id)
    setForm({ label: l?.label ?? field.label, url: l?.url ?? '', amount: l?.amountCents ? String(l.amountCents / 100) : '', status: l?.statusLabel ?? '' })
    setEditing(id)
  }
  const submit = () =>
    save.mutate(
      { id: current?.id, kind: current?.kind ?? kind, label: form.label, url: form.url || null, amountCents: dollarsToCents(form.amount), statusLabel: form.status || null },
      { onSuccess: () => (setEditing(null), toast.success(`${field.label} saved`)), onError: (e) => toast.error(e) },
    )
  return (
    <ControlFrame
      field={field}
      action={
        <Button size="sm" variant="ghost" onClick={() => open('new')}>
          <Plus aria-hidden /> Add link
        </Button>
      }
    >
      {list.length ? (
        <div className="stack gap-2">
          {list.map((l) => (
            <div key={l.id} className="row row--between gap-2">
              <div className="stack gap-1" style={{ minWidth: 0 }}>
                <span className="text text--sm text--medium text--truncate">
                  {l.label} {l.amountCents ? <span className="text--muted">· {money(l.amountCents)}</span> : null}
                </span>
                <span className="row gap-1">
                  {l.statusLabel ? <Badge>{l.statusLabel}</Badge> : null}
                  <Badge tone="outline" title={l.statusRecordedAt ? `Status entered ${dateTime(l.statusRecordedAt)}` : undefined}>
                    Manual · unverified
                  </Badge>
                </span>
              </div>
              <div className="row gap-1">
                {l.url ? (
                  <a className="button button--ghost button--sm button--icon" href={l.url} target="_blank" rel="noreferrer" aria-label={`Open ${l.label}`}>
                    <ExternalLink aria-hidden />
                  </a>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => open(l.id)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text text--sm text--muted">No reference yet</span>
      )}
      <Overlay
        open={!!editing}
        onRequestClose={() => setEditing(null)}
        title={current ? `Edit ${field.label.toLowerCase()}` : `Add ${field.label.toLowerCase()}`}
        footer={
          <>
            <span className="text text--xs text--muted">Links to your own billing provider. Riverly never charges or verifies payments.</span>
            <Button variant="primary" onClick={submit} loading={save.isPending} disabled={!form.label.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="stack gap-4">
          <Field label="Label">{(id) => <Input id={id} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} autoFocus />}</Field>
          <Field label="Link (invoice or payment page)">{(id) => <Input id={id} type="url" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />}</Field>
          <div className="grid grid--2 gap-4">
            <Field label="Amount">{(id) => <Input id={id} inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}</Field>
            <Field label="Status (manual)">{(id) => <Input id={id} placeholder="Sent, Paid, Overdue…" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />}</Field>
          </div>
        </div>
      </Overlay>
    </ControlFrame>
  )
}

/** Request review: a deliberate email send. Delivery never implies a review was posted. */
export function ReviewRequestControl({ field, ctx }: Props) {
  const latest = ctx.job.reviewRequests[0]
  const msg = latest?.latestMessage
  return (
    <ControlFrame field={field}>
      {latest ? (
        <div className="stack gap-2">
          <div className="row row--wrap gap-1">
            {msg ? <Badge tone={messageStatusTone(msg.status)}>{messageStatusLabel(msg.status)}</Badge> : null}
            <Badge tone="outline">Review {latest.reviewStatus === 'CONFIRMED' ? 'confirmed' : 'not confirmed'}</Badge>
          </div>
          <span className="text text--xs text--muted">
            Last requested {relative(msg?.queuedAt ?? latest.createdAt)} · {latest.destinationUrl.replace(/^https?:\/\//, '')}
          </span>
          <Button size="sm" variant="secondary" onClick={() => ctx.openEmail('review_request')}>
            <Star aria-hidden /> Request again
          </Button>
        </div>
      ) : (
        <div className="stack gap-2">
          <span className="text text--sm text--muted">Not requested</span>
          <Button size="sm" variant="primary" onClick={() => ctx.openEmail('review_request')}>
            <Star aria-hidden /> Request review
          </Button>
        </div>
      )}
    </ControlFrame>
  )
}
