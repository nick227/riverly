import type { FieldDef, OpportunityDetail } from '@project/sdk'
import { useSetOpportunityField, useUpdateOpportunity } from '@project/sdk'
import { Input, Select, Textarea, Checkbox } from '@/components/primitives/Controls'
import { EditableField } from '@/components/patterns/EditableField'
import { Field } from '@/components/patterns/Field'
import { Identity } from '@/components/patterns/Avatar'
import { toast } from '@/components/patterns/Toast'
import { centsToDollars, dateOnly, dateTime, dollarsToCents, fromLocalInput, money, toLocalInput } from '@/lib/format'
import type { WorkflowView } from '../config/workflow'
import { MemberSelect, useMemberName } from './MemberSelect'
import { AppointmentControl, AttachmentControl, ContactLogControl, ExternalLinkControl, ParticipantsControl, ProgressLogControl, ReviewRequestControl } from './StageControls'

const NATIVE_KEY: Record<string, keyof OpportunityDetail> = {
  'opportunity.title': 'title',
  'opportunity.propertyAddress': 'propertyAddress',
  'opportunity.inquiry': 'inquiry',
  'opportunity.leadSourceOptionId': 'leadSourceOptionId',
  'opportunity.urgencyOptionId': 'urgencyOptionId',
  'opportunity.ownerId': 'owner',
  'opportunity.nextFollowUpAt': 'nextFollowUpAt',
  'opportunity.estimatedValueCents': 'estimatedValueCents',
  'opportunity.contractValueCents': 'contractValueCents',
}

export type ControlContext = {
  job: OpportunityDetail
  stageId: string
  view: WorkflowView
  timezone?: string
  openEmail: (templateKey?: string) => void
}

/**
 * Renders one configured field. Value fields edit inline (native columns or custom values);
 * domain controls render their own records (activity, appointments, files, references).
 * The server validates every write against the same configuration.
 */
export function FieldControl({ field, ctx, inline }: { field: FieldDef; ctx: ControlContext; inline?: boolean }) {
  switch (field.type) {
    case 'contact_log':
      return <ContactLogControl field={field} ctx={ctx} />
    case 'progress_log':
      return <ProgressLogControl field={field} ctx={ctx} />
    case 'appointment':
      return <AppointmentControl field={field} ctx={ctx} />
    case 'participants':
      return <ParticipantsControl field={field} ctx={ctx} />
    case 'attachment':
    case 'gallery':
      return <AttachmentControl field={field} ctx={ctx} />
    case 'external_link':
      return <ExternalLinkControl field={field} ctx={ctx} />
    case 'review_request':
      return <ReviewRequestControl field={field} ctx={ctx} />
    default:
      return <ValueField field={field} ctx={ctx} inline={inline} />
  }
}

function ValueField({ field, ctx, inline }: { field: FieldDef; ctx: ControlContext; inline?: boolean }) {
  const update = useUpdateOpportunity(ctx.job.id)
  const setField = useSetOpportunityField(ctx.job.id)
  const memberName = useMemberName()
  const nativeKey = field.binding ? NATIVE_KEY[field.binding] : undefined
  const raw: unknown = nativeKey
    ? nativeKey === 'owner'
      ? (ctx.job.owner?.id ?? null)
      : ctx.job[nativeKey]
    : ctx.job.fieldValues[field.id] ?? null

  async function save(next: unknown) {
    try {
      if (nativeKey) {
        const key = nativeKey === 'owner' ? 'ownerId' : nativeKey
        await update.mutateAsync({ [key]: next } as never)
      } else {
        await setField.mutateAsync({ fieldId: field.id, value: next })
      }
      toast.success(`${field.label} saved`)
    } catch (err) {
      toast.error(err)
      throw err
    }
  }

  const display = displayValue(field, raw, ctx, memberName)
  const editable = field.editable !== false && !field.retired

  return (
    <Field label={field.label} inline={inline}>
      {(id) =>
        field.type === 'member' ? (
          <EditableField
            label={field.label}
            value={(raw as string | null) ?? null}
            display={field.binding === 'opportunity.ownerId' && ctx.job.owner ? <Identity name={ctx.job.owner.displayName} src={ctx.job.owner.avatarUrl} size="sm" /> : display}
            emptyLabel="Unassigned"
            disabled={!editable}
            onSave={save}
            renderEditor={({ value, setValue }) => <MemberSelect id={id} value={value} onChange={setValue} autoFocus />}
          />
        ) : field.type === 'boolean' ? (
          <Checkbox label={field.label} checked={!!raw} disabled={!editable} onChange={(e) => void save(e.target.checked).catch(() => {})} />
        ) : (
          <EditableField
            label={field.label}
            value={toDraft(field, raw)}
            display={display}
            multiline={field.type === 'textarea'}
            disabled={!editable}
            emptyLabel={field.placeholder ?? 'Add'}
            onSave={(draft) => save(fromDraft(field, draft))}
            renderEditor={({ value, setValue }) => <ValueEditor id={id} field={field} ctx={ctx} value={value} setValue={setValue} />}
          />
        )
      }
    </Field>
  )
}

function ValueEditor({ id, field, ctx, value, setValue }: { id: string; field: FieldDef; ctx: ControlContext; value: string | string[]; setValue: (v: any) => void }) {
  switch (field.type) {
    case 'textarea':
      return <Textarea id={id} value={value as string} onChange={(e) => setValue(e.target.value)} rows={4} autoFocus />
    case 'select':
      return (
        <Select
          id={id}
          value={value as string}
          onChange={(e) => setValue(e.target.value)}
          options={ctx.view.options(field.id, value as string).map((o) => ({ value: o.id, label: o.label }))}
          placeholder="Not set"
          autoFocus
        />
      )
    case 'multi_select':
      return (
        <div className="stack gap-2">
          {ctx.view.options(field.id).map((o) => (
            <Checkbox
              key={o.id}
              label={o.label}
              checked={(value as string[]).includes(o.id)}
              onChange={(e) => setValue(e.target.checked ? [...(value as string[]), o.id] : (value as string[]).filter((x) => x !== o.id))}
            />
          ))}
        </div>
      )
    case 'date':
      return <Input id={id} type="date" value={value as string} onChange={(e) => setValue(e.target.value)} autoFocus />
    case 'datetime':
      return <Input id={id} type="datetime-local" value={value as string} onChange={(e) => setValue(e.target.value)} autoFocus />
    case 'money':
      return <Input id={id} inputMode="decimal" placeholder="0" value={value as string} onChange={(e) => setValue(e.target.value)} autoFocus />
    case 'url':
      return <Input id={id} type="url" placeholder="https://" value={value as string} onChange={(e) => setValue(e.target.value)} autoFocus />
    default:
      return <Input id={id} value={value as string} onChange={(e) => setValue(e.target.value)} autoFocus />
  }
}

function toDraft(field: FieldDef, raw: unknown): string | string[] {
  if (field.type === 'multi_select') return Array.isArray(raw) ? (raw as string[]) : []
  if (field.type === 'datetime') return toLocalInput(raw as string | null)
  if (field.type === 'money') return centsToDollars(raw as number | null)
  return (raw as string | null) ?? ''
}

function fromDraft(field: FieldDef, draft: string | string[]): unknown {
  if (field.type === 'multi_select') return draft
  const s = (draft as string).trim()
  if (field.type === 'datetime') return fromLocalInput(s)
  if (field.type === 'money') return dollarsToCents(s)
  return s === '' ? null : s
}

export function displayValue(field: FieldDef, raw: unknown, ctx: Pick<ControlContext, 'view' | 'timezone'>, memberName?: (id: string) => string | null) {
  if (raw === null || raw === undefined || raw === '') return null
  switch (field.type) {
    case 'select':
      return ctx.view.optionLabel(field.id, raw as string)
    case 'multi_select':
      return (raw as string[]).map((id) => ctx.view.optionLabel(field.id, id)).join(', ')
    case 'money':
      return money(raw as number)
    case 'date':
      return dateOnly(`${raw as string}T12:00:00Z`)
    case 'datetime':
      return dateTime(raw as string, ctx.timezone)
    case 'boolean':
      return raw ? 'Yes' : 'No'
    case 'member':
      return memberName?.(raw as string) ?? null
    case 'url':
      return (raw as string).replace(/^https?:\/\//, '')
    default:
      return String(raw)
  }
}
