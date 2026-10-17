import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Paperclip, X } from 'lucide-react'
import type { AttachmentRef, OpportunityDetail } from '@project/sdk'
import { idempotencyKey, useCreatePost, useLogActivity, useUploadAttachment } from '@project/sdk'
import { Button, IconButton, Input, Select, Textarea } from '@/components/primitives/Controls'
import { Avatar } from '@/components/patterns/Avatar'
import { Segmented } from '@/components/patterns/Segmented'
import { toast } from '@/components/patterns/Toast'
import { fromLocalInput } from '@/lib/format'
import { useSession } from '@/lib/session'
import type { WorkflowView } from '../config/workflow'

type Kind = 'note' | 'contact_attempt' | 'progress'

/** Pending uploads for a composer — stored once, linked when the entry is saved. */
function useComposerFiles() {
  const [files, setFiles] = useState<AttachmentRef[]>([])
  const upload = useUploadAttachment()
  const input = useRef<HTMLInputElement>(null)
  const picker = (
    <>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        onChange={async (e) => {
          for (const f of Array.from(e.target.files ?? [])) {
            try {
              const ref = await upload.mutateAsync(f)
              setFiles((prev) => [...prev, ref])
            } catch (err) {
              toast.error(err)
            }
          }
          e.target.value = ''
        }}
      />
      <IconButton label="Attach files" icon={<Paperclip />} size="sm" onClick={() => input.current?.click()} loading={upload.isPending} />
    </>
  )
  const list = files.length ? (
    <div className="row row--wrap gap-2">
      {files.map((f) => (
        <span key={f.attachmentId} className="file-chip">
          <span className="text--truncate">{f.fileName}</span>
          <IconButton label={`Remove ${f.fileName}`} icon={<X />} size="sm" onClick={() => setFiles(files.filter((x) => x.attachmentId !== f.attachmentId))} />
        </span>
      ))}
    </div>
  ) : null
  return { files, clear: () => setFiles([]), picker, list, uploading: upload.isPending }
}

/** Identical structured composer on every stage: note, contact attempt or progress update. */
export function JobComposer({ job, stageId, view }: { job: OpportunityDetail; stageId: string; view: WorkflowView }) {
  const log = useLogActivity(job.id)
  const attach = useComposerFiles()
  const [kind, setKind] = useState<Kind>('note')
  const [note, setNote] = useState('')
  const [methodId, setMethodId] = useState(view.def.activity.methods[0]?.id ?? '')
  const [outcomeId, setOutcomeId] = useState('')
  const [followUp, setFollowUp] = useState('')
  const key = useRef(idempotencyKey())
  const valid = kind === 'contact_attempt' ? !!methodId && !!outcomeId : !!note.trim() || attach.files.length > 0

  function submit() {
    log.mutate(
      {
        kind,
        stageId,
        note: note.trim() || null,
        methodId: kind === 'contact_attempt' ? methodId : null,
        outcomeId: kind === 'contact_attempt' ? outcomeId : null,
        nextFollowUpAt: fromLocalInput(followUp),
        attachmentIds: attach.files.map((f) => f.attachmentId),
        idempotencyKey: key.current,
      },
      {
        onSuccess: () => {
          setNote('')
          setOutcomeId('')
          setFollowUp('')
          attach.clear()
          key.current = idempotencyKey()
          toast.success(kind === 'contact_attempt' ? 'Attempt logged' : 'Saved to activity')
        },
        onError: (e) => toast.error(e),
      },
    )
  }

  return (
    <div className="crm-composer">
      <Segmented
        label="Entry type"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'contact_attempt', label: 'Contact' },
          { value: 'progress', label: 'Update' },
        ]}
      />
      {kind === 'contact_attempt' ? (
        <div className="crm-composer__options">
          <Select size_="sm" aria-label="Method" value={methodId} onChange={(e) => setMethodId(e.target.value)} options={view.def.activity.methods.filter((m) => !m.retired).map((m) => ({ value: m.id, label: m.label }))} />
          <Select size_="sm" aria-label="Outcome" value={outcomeId} onChange={(e) => setOutcomeId(e.target.value)} placeholder="Outcome" options={view.def.activity.outcomes.filter((o) => !o.retired).map((o) => ({ value: o.id, label: o.label }))} />
          <Input size_="sm" type="datetime-local" aria-label="Next follow-up" title="Next follow-up" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
      ) : null}
      <Textarea aria-label="Note" placeholder={kind === 'contact_attempt' ? 'What happened? (optional)' : kind === 'progress' ? 'Progress update for the team' : 'Add a note'} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      {attach.list}
      <div className="crm-composer__footer">
        <div className="row gap-2">
          {attach.picker}
          <span className="text text--xs text--muted">Saved to {view.stageLabel(stageId)}</span>
        </div>
        <Button size="sm" variant="primary" onClick={submit} loading={log.isPending} disabled={!valid || attach.uploading}>
          {kind === 'contact_attempt' ? 'Log attempt' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/** Team post for the company river. */
export function PostComposer({ opportunityId }: { opportunityId?: string }) {
  const { me } = useSession()
  const post = useCreatePost()
  const attach = useComposerFiles()
  const [body, setBody] = useState('')
  const key = useRef(idempotencyKey())
  if (!me) return null
  return (
    <div className="crm-composer crm-composer--inline">
      <div className="crm-composer__line">
        {me.slug ? (
          <Link to={`/u/${me.slug}`} aria-label={me.displayName}>
            <Avatar name={me.displayName} src={me.avatarUrl} size="sm" />
          </Link>
        ) : (
          <Avatar name={me.displayName} src={me.avatarUrl} size="sm" />
        )}
        <Textarea aria-label="Share an update" placeholder="Share an update with the team" value={body} onChange={(e) => setBody(e.target.value)} rows={1} />
        {attach.picker}
        <Button
          size="sm"
          variant="primary"
          disabled={!body.trim() || attach.uploading}
          loading={post.isPending}
          onClick={() =>
            post.mutate(
              { body, opportunityId: opportunityId ?? null, attachmentIds: attach.files.map((f) => f.attachmentId), idempotencyKey: key.current },
              {
                onSuccess: () => {
                  setBody('')
                  attach.clear()
                  key.current = idempotencyKey()
                  toast.success('Posted')
                },
                onError: (e) => toast.error(e),
              },
            )
          }
        >
          Post
        </Button>
      </div>
      {attach.list}
    </div>
  )
}
