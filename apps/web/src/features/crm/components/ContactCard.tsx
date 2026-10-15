import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, MessageSquare, Phone, Plus } from 'lucide-react'
import type { ContactDetail, OpportunityDetail } from '@project/sdk'
import { useCreateOpportunity, useUpdateContact } from '@project/sdk'
import { Button, ButtonAnchor, Input, Select, Textarea } from '@/components/primitives/Controls'
import { AttachmentGrid } from '@/components/patterns/Attachments'
import { Avatar } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardSection } from '@/components/patterns/Card'
import { EditableField } from '@/components/patterns/EditableField'
import { Field, FieldList } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { toast } from '@/components/patterns/Toast'
import { cx } from '@/lib/cx'
import { dateOnly } from '@/lib/format'
import { messageStatusLabel, messageStatusTone } from '../config/labels'
import type { WorkflowView } from '../config/workflow'
import { FieldControl, type ControlContext } from './FieldControl'

const ACTION_ICON = { call: Phone, text: MessageSquare, email: Mail }

/**
 * Persistent contact bio. Person details are stored on the contact (shared by every job);
 * the job facts shown here are stored on the selected job and edited through it.
 */
export function ContactCard({
  job,
  contact,
  ctx,
  onSchedule,
}: {
  job: OpportunityDetail
  contact: ContactDetail | undefined
  ctx: ControlContext
  onSchedule?: () => void
}) {
  const person = job.contact
  const update = useUpdateContact(person.id)
  const actions = (ctx.view.def.contactCard.actions ?? []).filter((a) => a !== 'schedule')
  const jobFields = ctx.view.def.contactCard.jobFieldIds.map((id) => ctx.view.field(id)).filter((f) => f && f.visible !== false)
  const photos = job.attachments.filter((a) => a.mimeType.startsWith('image/'))
  const [showPhotos, setShowPhotos] = useState(false)
  const firstSource = contact?.sources[0]

  const saveContact = (patch: Record<string, string | null>) =>
    update.mutateAsync(patch).then(
      () => toast.success('Contact updated'),
      (e) => {
        toast.error(e)
        throw e
      },
    )

  const href = (a: string) => (a === 'call' && person.phone ? `tel:${person.phone}` : a === 'text' && person.phone ? `sms:${person.phone}` : null)

  return (
    <Card as="section" aria-label="Contact" className="crm-contact">
      <div className="crm-contact__identity">
        <Avatar name={person.name} size="lg" />
        <div className="stack gap-1" style={{ minWidth: 0 }}>
          <h2 className="crm-contact__name">{person.name}</h2>
          <span className="text text--xs text--muted">
            {ctx.view.terms.contact} since {dateOnly(person.createdAt, ctx.timezone)}
            {firstSource ? ` · ${firstSource.sourceName}` : ''}
          </span>
        </div>
      </div>

      <div className="crm-contact__actions">
        {actions.map((a) => {
          const Icon = ACTION_ICON[a as keyof typeof ACTION_ICON]
          if (!Icon) return null
          const label = a[0]!.toUpperCase() + a.slice(1)
          const link = href(a)
          if (a === 'call' || a === 'text')
            return link ? (
              <ButtonAnchor key={a} href={link} size="sm" title={`${label} ${person.phone}`}>
                <Icon size={14} aria-hidden /> {label}
              </ButtonAnchor>
            ) : (
              <Button key={a} size="sm" disabled title="No phone number">
                <Icon size={14} aria-hidden /> {label}
              </Button>
            )
          return (
            <Button key={a} size="sm" onClick={() => ctx.openEmail()} disabled={!person.email} title={!person.email ? 'No email address' : undefined}>
              <Icon size={14} aria-hidden /> {label}
            </Button>
          )
        })}
      </div>

      <CardSection>
        <FieldList>
          <InlineContactField label="Phone" value={person.phone} type="tel" onSave={(v) => saveContact({ phone: v })} />
          <InlineContactField label="Email" value={person.email} type="email" onSave={(v) => saveContact({ email: v })} />
          <Field label="Address" inline>
            <EditableField
              label="Address"
              value={{ addressLine: person.addressLine ?? '', city: person.city ?? '', region: person.region ?? '', postalCode: person.postalCode ?? '' }}
              display={[person.addressLine, [person.city, person.region].filter(Boolean).join(', '), person.postalCode].filter(Boolean).join(' ') || null}
              onSave={(v) => saveContact({ addressLine: v.addressLine || null, city: v.city || null, region: v.region || null, postalCode: v.postalCode || null })}
              renderEditor={({ value, setValue }) => (
                <div className="stack gap-2">
                  <Input aria-label="Street" placeholder="Street" value={value.addressLine} onChange={(e) => setValue({ ...value, addressLine: e.target.value })} autoFocus />
                  <div className="grid grid--3 gap-2">
                    <Input aria-label="City" placeholder="City" value={value.city} onChange={(e) => setValue({ ...value, city: e.target.value })} />
                    <Input aria-label="State" placeholder="State" value={value.region} onChange={(e) => setValue({ ...value, region: e.target.value })} />
                    <Input aria-label="ZIP" placeholder="ZIP" value={value.postalCode} onChange={(e) => setValue({ ...value, postalCode: e.target.value })} />
                  </div>
                </div>
              )}
            />
          </Field>
          {jobFields.map((f) => (
            <FieldControl key={f!.id} field={f!} ctx={ctx} inline />
          ))}
          <Field label="Notes" inline>
            <EditableField
              label="Notes"
              value={person.notes ?? ''}
              display={person.notes}
              multiline
              onSave={(v) => saveContact({ notes: v || null })}
              renderEditor={({ value, setValue }) => <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />}
            />
          </Field>
        </FieldList>
      </CardSection>

      {photos.length ? (
        <CardSection>
          <div className="crm-contact__section-title">Photos</div>
          <AttachmentGrid items={photos} limit={showPhotos ? undefined : 3} onMore={() => setShowPhotos(true)} />
        </CardSection>
      ) : null}

      <CardSection>
        <div className="row row--between items-center" style={{ marginBottom: 'var(--space-2)' }}>
          <div className="crm-contact__section-title" style={{ margin: 0 }}>Email history</div>
          <Button size="sm" variant="ghost" onClick={() => ctx.openEmail()}>
            <Mail size={13} aria-hidden /> Send email
          </Button>
        </div>
        {contact?.recentEmails && contact.recentEmails.length > 0 ? (
          <div className="crm-contact__email-list">
            {contact.recentEmails.map((m) => (
              <div key={m.id} className="crm-contact__email-item">
                <div className="stack gap-0.5 grow" style={{ minWidth: 0 }}>
                  <span className="text text--sm text--truncate text--medium" title={m.subject}>
                    {m.subject || '(No subject)'}
                  </span>
                  <span className="text text--xs text--muted">
                    {dateOnly(m.queuedAt, ctx.timezone)}
                  </span>
                </div>
                <Badge tone={messageStatusTone(m.status)}>{messageStatusLabel(m.status)}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="crm-contact__empty-emails">
            <span className="text text--xs text--muted">No emails sent yet</span>
          </div>
        )}
      </CardSection>
    </Card>
  )
}

function InlineContactField({ label, value, type, onSave }: { label: string; value: string | null; type: string; onSave: (v: string | null) => Promise<unknown> }) {
  return (
    <Field label={label} inline>
      <EditableField
        label={label}
        value={value ?? ''}
        display={value}
        onSave={(v) => onSave(v.trim() || null)}
        renderEditor={({ value: v, setValue }) => <Input type={type} value={v} onChange={(e) => setValue(e.target.value)} autoFocus />}
      />
    </Field>
  )
}

export function NewJobOverlay({ contactId, view, defaultAddress, onClose }: { contactId: string; view: WorkflowView; defaultAddress?: string | null; onClose: () => void }) {
  const create = useCreateOpportunity(contactId)
  const leadField = view.fieldFor('opportunity.leadSourceOptionId')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState(defaultAddress ?? '')
  const [source, setSource] = useState('')
  const navigate = useNavigate()
  return (
    <Overlay
      open
      onRequestClose={onClose}
      title={`New ${view.terms.opportunity.toLowerCase()}`}
      footer={
        <>
          <span className="text text--xs text--muted">Starts in {view.active[0]?.label}. Existing jobs are not affected.</span>
          <Button
            variant="primary"
            disabled={!title.trim()}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { title, propertyAddress: address || null, leadSourceOptionId: source || null },
                { onSuccess: (j) => (toast.success(`${view.terms.opportunity} created`), onClose(), navigate(`/jobs/${j.id}`)), onError: (e) => toast.error(e) },
              )
            }
          >
            Create
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label={view.fieldFor('opportunity.title')?.label ?? 'Service'}>{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Roof repair, replacement, gutters…" autoFocus />}</Field>
        <Field label={view.fieldFor('opportunity.propertyAddress')?.label ?? 'Property'}>{(id) => <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} />}</Field>
        {leadField ? (
          <Field label={leadField.label}>
            {(id) => <Select id={id} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Not recorded" options={view.options(leadField.id).map((o) => ({ value: o.id, label: o.label }))} />}
          </Field>
        ) : null}
      </div>
    </Overlay>
  )
}
