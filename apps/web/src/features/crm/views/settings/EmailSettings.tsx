import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { EmailTemplate } from '@project/sdk'
import { useCreateSender, useDeleteSender, useEmailTemplates, useSenders, useUpdateEmailTemplate, useVerifySender } from '@project/sdk'
import { KNOWN_TOKENS } from '@project/shared/email'
import { Button, Checkbox, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { relative } from '@/lib/format'
import { useWorkflowView } from '../../config/workflow'

export function EmailSettings() {
  return (
    <div className="stack gap-6">
      <Senders />
      <Templates />
    </div>
  )
}

/** Company-owned sending identities. Real sending uses the company's verified domain at Resend. */
function Senders() {
  const senders = useSenders()
  const verify = useVerifySender()
  const remove = useDeleteSender()
  const [adding, setAdding] = useState(false)
  return (
    <Card>
      <CardHeader
        title="Sender"
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Connect sender
          </Button>
        }
      />
      {senders.isLoading ? (
        <SkeletonList rows={1} />
      ) : (
        <div className="list">
          {(senders.data ?? []).map((s) => (
            <div key={s.id} className="list__row">
              <div className="stack gap-1 grow" style={{ minWidth: 0 }}>
                <span className="text text--sm text--medium">
                  {s.fromName} &lt;{s.fromEmail}&gt; {s.isDefault ? <Badge tone="outline">Default</Badge> : null}
                </span>
                <span className="text text--xs text--muted">{s.provider === 'DEV_LOG' ? 'Development transport — writes to the local outbox, never delivers' : `Resend${s.hasCredential ? ' · company API key stored encrypted' : ' · platform key'}`}</span>
                {s.verificationDetail ? <span className="text text--xs text--muted">{s.verificationDetail}</span> : null}
              </div>
              <Badge tone={s.verification === 'VERIFIED' ? 'success' : s.verification === 'FAILED' ? 'danger' : 'warning'}>{s.verification.toLowerCase()}</Badge>
              {s.provider === 'RESEND' ? (
                <Button size="sm" variant="ghost" loading={verify.isPending} onClick={() => verify.mutate(s.id, { onSuccess: (r) => toast.success(`Sender ${r.verification.toLowerCase()}`), onError: (e) => toast.error(e) })}>
                  Check
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id, { onSuccess: () => toast.success('Sender removed'), onError: (e) => toast.error(e) })}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      {!senders.data?.some((s) => s.provider === 'RESEND' && s.verification === 'VERIFIED') ? (
        <div className="mt-4">
          <Notice>Connect your company’s Resend account and verify your domain to send real email. Until then, the development transport records messages without delivering them.</Notice>
        </div>
      ) : null}
      {adding ? <SenderForm onClose={() => setAdding(false)} /> : null}
    </Card>
  )
}

function SenderForm({ onClose }: { onClose: () => void }) {
  const create = useCreateSender()
  const [v, setV] = useState({ provider: 'RESEND' as 'RESEND' | 'DEV_LOG', fromName: '', fromEmail: '', replyTo: '', apiKey: '', isDefault: true })
  return (
    <Overlay
      open
      onRequestClose={onClose}
      title="Connect sender"
      footer={
        <>
          <Checkbox label="Use as default sender" checked={v.isDefault} onChange={(e) => setV({ ...v, isDefault: e.target.checked })} />
          <Button
            variant="primary"
            disabled={!v.fromName || !v.fromEmail}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { provider: v.provider, fromName: v.fromName, fromEmail: v.fromEmail, replyTo: v.replyTo || null, apiKey: v.apiKey || null, isDefault: v.isDefault },
                { onSuccess: (s) => (toast.success(`Sender ${s.verification.toLowerCase()}`), onClose()), onError: (e) => toast.error(e) },
              )
            }
          >
            Connect
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <Field label="Provider">
          {(id) => <Select id={id} value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value as 'RESEND' })} options={[{ value: 'RESEND', label: 'Resend (real sending)' }, { value: 'DEV_LOG', label: 'Development transport (no delivery)' }]} />}
        </Field>
        <div className="grid grid--2 gap-4">
          <Field label="From name">{(id) => <Input id={id} value={v.fromName} onChange={(e) => setV({ ...v, fromName: e.target.value })} placeholder="NV Custom Homes" />}</Field>
          <Field label="From email" hint="Must be on a domain verified in Resend">{(id) => <Input id={id} type="email" value={v.fromEmail} onChange={(e) => setV({ ...v, fromEmail: e.target.value })} placeholder="hello@yourcompany.com" />}</Field>
        </div>
        <Field label="Reply-to (optional)">{(id) => <Input id={id} type="email" value={v.replyTo} onChange={(e) => setV({ ...v, replyTo: e.target.value })} />}</Field>
        {v.provider === 'RESEND' ? (
          <Field label="Resend API key" hint="Stored encrypted. Never shown again.">{(id) => <Input id={id} type="password" autoComplete="off" value={v.apiKey} onChange={(e) => setV({ ...v, apiKey: e.target.value })} placeholder="re_…" />}</Field>
        ) : null}
      </div>
    </Overlay>
  )
}

function Templates() {
  const templates = useEmailTemplates()
  const { view } = useWorkflowView()
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  if (templates.isLoading || !view) return <SkeletonList rows={4} />
  return (
    <Card>
      <CardHeader title="Templates" />
      <p className="text text--sm text--muted" style={{ marginBottom: 'var(--space-4)' }}>
        Suggested on stages, always sent deliberately by a person. Edits here change future emails only.
      </p>
      <div className="list">
        {(templates.data ?? []).map((t) => (
          <div key={t.id} className="list__row">
            <div className="stack gap-1 grow" style={{ minWidth: 0 }}>
              <span className="text text--sm text--medium">{t.label}</span>
              <span className="text text--xs text--muted text--truncate">{t.subjectTemplate}</span>
            </div>
            {t.stageId ? <Badge tone="outline">{view.stageLabel(t.stageId)}</Badge> : null}
            {!t.isEnabled ? <Badge>Off</Badge> : null}
            <span className="text text--xs text--muted">v{t.version} · {relative(t.updatedAt)}</span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
              Edit
            </Button>
          </div>
        ))}
      </div>
      {editing ? <TemplateForm template={editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  )
}

function TemplateForm({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const update = useUpdateEmailTemplate()
  const { view } = useWorkflowView()
  const [v, setV] = useState({ label: template.label, stageId: template.stageId ?? '', subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate, isEnabled: template.isEnabled })
  return (
    <Overlay
      open
      variant="wide"
      onRequestClose={onClose}
      title={`Edit “${template.label}”`}
      footer={
        <>
          <Checkbox label="Available to the team" checked={v.isEnabled} onChange={(e) => setV({ ...v, isEnabled: e.target.checked })} />
          <Button variant="primary" loading={update.isPending} onClick={() => update.mutate({ id: template.id, ...v, stageId: v.stageId || null }, { onSuccess: () => (toast.success('Template saved'), onClose()), onError: (e) => toast.error(e) })}>
            Save
          </Button>
        </>
      }
    >
      <div className="stack gap-4">
        <div className="grid grid--2 gap-4">
          <Field label="Name">{(id) => <Input id={id} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />}</Field>
          <Field label="Suggested on stage">{(id) => <Select id={id} value={v.stageId} onChange={(e) => setV({ ...v, stageId: e.target.value })} placeholder="Any stage" options={(view?.active ?? []).map((s) => ({ value: s.id, label: s.label }))} />}</Field>
        </div>
        <Field label="Subject">{(id) => <Input id={id} value={v.subjectTemplate} onChange={(e) => setV({ ...v, subjectTemplate: e.target.value })} />}</Field>
        <Field label="Message">{(id) => <Textarea id={id} rows={10} value={v.bodyTemplate} onChange={(e) => setV({ ...v, bodyTemplate: e.target.value })} />}</Field>
        <p className="text text--xs text--muted">
          Placeholders: {KNOWN_TOKENS.map((t) => `{{${t}}}`).join(' ')}. Values come from real records; if one is missing the sender must fill it in before sending.
        </p>
      </div>
    </Overlay>
  )
}
