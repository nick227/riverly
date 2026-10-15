import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { idempotencyKey, useEmailTemplates, useRenderEmail, useSendEmail, type RenderedEmail } from '@project/sdk'
import { Button, IconButton, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Field } from '@/components/patterns/Field'
import { Overlay } from '@/components/patterns/Overlay'
import { Notice, Spinner } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { relative } from '@/lib/format'
import { messageStatusLabel, messageStatusTone } from '../config/labels'

export type EmailRequest = { contactId: string; opportunityId?: string | null; stageId?: string | null; templateKey?: string; suggestedKeys?: string[] }

const TOKEN = /\{\{\s*[a-zA-Z]+\.[a-zA-Z]+\s*\}\}/g
const HAS_TOKEN = /\{\{\s*[a-zA-Z]+\.[a-zA-Z]+\s*\}\}/

type Template = { id: string; stableKey: string }
type Confirm = { kind: 'close' } | { kind: 'switch'; templateId: string }

/** Requested template, else the first suggested one, else the first enabled one. */
function initialTemplate<T extends Template>(enabled: T[], request: EmailRequest) {
  return enabled.find((t) => t.stableKey === request.templateKey) ?? enabled.find((t) => request.suggestedKeys?.includes(t.stableKey)) ?? enabled[0]
}

/** The personal note goes after the greeting (the first paragraph). */
function withPersonalNote(body: string, note: string) {
  if (!note.trim()) return body
  const parts = body.split('\n\n')
  return [parts[0], note.trim(), ...parts.slice(1)].join('\n\n')
}

/** Placeholders the server could not fill; the email cannot be sent until they are replaced. */
function unresolvedTokens(subject: string, body: string) {
  return [...new Set([...(subject.match(TOKEN) ?? []), ...(body.match(TOKEN) ?? [])])]
}

/**
 * Universal email overlay (never a page). Opens fully prepared from real records, shows
 * From / To / Subject / exact body before a single explicit Send, and closes back to the
 * exact place it was opened. Edits apply to this message only, never the company template.
 */
export function EmailModal({ request, onClose }: { request: EmailRequest; onClose: () => void }) {
  const templates = useEmailTemplates()
  const send = useSendEmail()
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [note, setNote] = useState('')
  const [dirty, setDirty] = useState(false)
  const [full, setFull] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const key = useRef(idempotencyKey())

  const enabled = useMemo(() => (templates.data ?? []).filter((t) => t.isEnabled), [templates.data])
  const ordered = useMemo(() => {
    const suggested = new Set(request.suggestedKeys ?? [])
    return [...enabled].sort((a, b) => Number(suggested.has(b.stableKey)) - Number(suggested.has(a.stableKey)))
  }, [enabled, request.suggestedKeys])

  useEffect(() => {
    if (templateId || !enabled.length) return
    setTemplateId(initialTemplate(enabled, request)!.id)
  }, [enabled, templateId, request.templateKey, request.suggestedKeys])

  const rendered = useRenderEmail(templateId ? { templateId, contactId: request.contactId, opportunityId: request.opportunityId ?? null } : null)
  const preview = rendered.data

  useEffect(() => {
    if (preview && !dirty) {
      setSubject(preview.subject)
      setBody(preview.body)
    }
  }, [preview, dirty])

  const finalBody = useMemo(() => withPersonalNote(body, note), [body, note])
  const remaining = unresolvedTokens(subject, finalBody)
  const blockers = preview?.blockers ?? []
  const canSend = !!preview && !blockers.length && !remaining.length && subject.trim() && finalBody.trim() && !send.isSuccess
  const isReview = preview?.templateKey === 'review_request'
  const priorSame = preview?.priorSends.filter((m) => m.templateKey === preview.templateKey) ?? []
  const edited = dirty || !!note.trim()

  function requestClose() {
    if (edited && !send.isSuccess) setConfirm({ kind: 'close' })
    else onClose()
  }
  function switchTemplate(id: string) {
    if (edited) setConfirm({ kind: 'switch', templateId: id })
    else applyTemplate(id)
  }
  function applyTemplate(id: string) {
    setDirty(false)
    setNote('')
    setTemplateId(id)
    key.current = idempotencyKey()
  }
  function discard(c: Confirm) {
    setConfirm(null)
    if (c.kind === 'close') onClose()
    else applyTemplate(c.templateId)
  }
  function submit() {
    if (!preview) return
    send.mutate(
      { templateId, contactId: request.contactId, opportunityId: request.opportunityId ?? null, stageId: request.stageId ?? null, subject, body: finalBody, idempotencyKey: key.current },
      {
        onSuccess: () => {
          toast.success('Email queued — delivery status will appear in Activity')
          onClose()
        },
        onError: (e) => toast.error(e),
      },
    )
  }

  return (
    <Overlay
      open
      variant={full ? 'full' : 'wide'}
      onRequestClose={requestClose}
      title={isReview ? 'Request a review' : 'Email'}
      headerExtra={<IconButton label={full ? 'Exit full screen' : 'Full screen'} icon={full ? <Minimize2 /> : <Maximize2 />} onClick={() => setFull(!full)} />}
      footer={
        <>
          <span className="text text--xs text--muted">{remaining.length ? 'Replace the highlighted placeholders to send.' : 'Sends once. Status updates appear in Activity.'}</span>
          <div className="action-bar">
            <Button variant="ghost" onClick={requestClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={send.isPending} disabled={!canSend}>
              Send email
            </Button>
          </div>
        </>
      }
    >
      {confirm ? (
        <DiscardConfirm confirm={confirm} onKeep={() => setConfirm(null)} onDiscard={() => discard(confirm)} />
      ) : (
        <div className="stack gap-4">
          <Field label="Template">
            {(id) => (
              <Select
                id={id}
                value={templateId ?? ''}
                onChange={(e) => switchTemplate(e.target.value)}
                options={ordered.map((t) => ({ value: t.id, label: `${t.label}${request.suggestedKeys?.includes(t.stableKey) ? ' — suggested' : ''}` }))}
              />
            )}
          </Field>

          {rendered.isLoading || !preview ? (
            <div className="page-state" style={{ minHeight: 200 }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {blockers.map((b) => (
                <Notice key={b} tone="warning">
                  {b}
                </Notice>
              ))}
              <EnvelopeMeta preview={preview} />
              {priorSame.length ? (
                <Notice>
                  {isReview ? 'A review was already requested' : 'This template was already sent'} {relative(priorSame[0]!.queuedAt)} ({messageStatusLabel(priorSame[0]!.status).toLowerCase()}). Sending again creates a new message.
                </Notice>
              ) : null}
              <Field label="Subject">
                {(id) => (
                  <Input
                    id={id}
                    value={subject}
                    invalid={HAS_TOKEN.test(subject)}
                    onChange={(e) => {
                      setSubject(e.target.value)
                      setDirty(true)
                    }}
                  />
                )}
              </Field>
              <Field label="Message" error={remaining.length ? `Unresolved: ${remaining.join(', ')}` : undefined}>
                {(id) => (
                  <Textarea
                    id={id}
                    className="crm-email__body"
                    value={body}
                    invalid={remaining.length > 0}
                    onChange={(e) => {
                      setBody(e.target.value)
                      setDirty(true)
                    }}
                  />
                )}
              </Field>
              <Field label="Personal note (optional)" hint="Added after the greeting.">
                {(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
              </Field>
              <EarlierEmails sends={preview.priorSends} />
            </>
          )}
        </div>
      )}
    </Overlay>
  )
}

function DiscardConfirm({ confirm, onKeep, onDiscard }: { confirm: Confirm; onKeep: () => void; onDiscard: () => void }) {
  return (
    <div className="stack gap-4">
      <Notice tone="warning">{confirm.kind === 'close' ? 'Discard your edits to this email?' : 'Switching templates replaces your edited message.'}</Notice>
      <div className="action-bar">
        <Button variant="ghost" onClick={onKeep}>
          Keep editing
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          Discard edits
        </Button>
      </div>
    </div>
  )
}

function EnvelopeMeta({ preview }: { preview: RenderedEmail }) {
  return (
    <dl className="crm-email__meta">
      <dt>From</dt>
      <dd>
        {preview.sender ? (
          <span className="row gap-2">
            {preview.sender.fromName} &lt;{preview.sender.fromEmail}&gt;
            {preview.sender.provider === 'DEV_LOG' ? <Badge tone="warning">Development — not delivered</Badge> : null}
          </span>
        ) : (
          <span className="text--danger">No sender configured</span>
        )}
      </dd>
      <dt>To</dt>
      <dd>{preview.to.email ? `${preview.to.name} <${preview.to.email}>` : <span className="text--danger">{preview.to.name} has no email address</span>}</dd>
    </dl>
  )
}

function EarlierEmails({ sends }: { sends: RenderedEmail['priorSends'] }) {
  if (!sends.length) return null
  return (
    <details>
      <summary className="text text--sm text--muted" style={{ cursor: 'pointer' }}>
        Earlier emails ({sends.length})
      </summary>
      <div className="list mt-2">
        {sends.map((m) => (
          <div key={m.id} className="list__row">
            <span className="text text--sm grow text--truncate">{m.subject}</span>
            <span className="text text--xs text--muted">{relative(m.queuedAt)}</span>
            <Badge tone={messageStatusTone(m.status)}>{messageStatusLabel(m.status)}</Badge>
          </div>
        ))}
      </div>
    </details>
  )
}
