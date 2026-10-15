import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useContact, useOpportunity, useResources, useTransitionOpportunity, type OpportunityDetail } from '@project/sdk'
import { Badge } from '@/components/patterns/Badge'
import { toast } from '@/components/patterns/Toast'
import { ErrorState, PageState, Skeleton } from '@/components/patterns/States'
import { dateOnly } from '@/lib/format'
import { useSession } from '@/lib/session'
import { ActivityRiver } from '../components/ActivityRiver'
import { JobComposer } from '../components/Composers'
import { ContactCard } from '../components/ContactCard'
import { EmailModal, type EmailRequest } from '../components/EmailModal'
import type { ControlContext } from '../components/FieldControl'
import { PipelineBar } from '../components/PipelineBar'
import { ScheduleOverlay } from '../components/StageControls'
import { StageWorkspace } from '../components/StageWorkspace'
import { statusLabel, statusTone } from '../config/labels'
import { useWorkflowView, type WorkflowView } from '../config/workflow'

/**
 * Individual contact workflow / job detail page.
 * Title displays the customer's name; pipeline bar displays distinct stage progress
 * and the active viewing segment; stage workspace provides consistent layouts and
 * one-click stage confirmation.
 */
export default function JobView() {
  const { jobId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const job = useOpportunity(jobId)
  const contact = useContact(job.data?.contactId)
  const { view } = useWorkflowView()
  const resources = useResources()
  const { org } = useSession()
  const [email, setEmail] = useState<EmailRequest | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const transition = useTransitionOpportunity(jobId)

  const data = job.data
  const selectedStageId = params.get('stage') ?? data?.stageId ?? ''
  const selected = view?.stage(selectedStageId) ?? view?.stage(data?.stageId)

  const stageMeta = useMemo(() => stageReachedDates(data?.transitions ?? [], org?.timezone), [data?.transitions, org?.timezone])

  if (job.isLoading || !view) return <JobSkeleton />
  if (job.error || !data) return <div className="crm-page"><ErrorState error={job.error} onRetry={() => void job.refetch()} /></div>
  if (!selected) return <PageState />

  const ctx: ControlContext = {
    job: data,
    stageId: selected.id,
    view,
    timezone: org?.timezone,
    openEmail: (templateKey) =>
      setEmail({ contactId: data.contactId, opportunityId: data.id, stageId: selected.id, templateKey, suggestedKeys: selected.emailTemplateKeys }),
  }
  const scheduleStage = view.active.find((s) => s.fieldIds.some((f) => view.field(f)?.type === 'appointment')) ?? selected

  const selectStage = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('stage', id)
    setParams(next, { replace: true })
  }

  const toggleStage = (stageId: string) => {
    const move = stageToggleMove(view.active, view.stageIndex(data.stageId), stageId)
    if (!move) return
    transition.mutate(
      { toStageId: move.toStageId, reason: null },
      {
        onSuccess: () => {
          toast.success(move.message)
          selectStage(move.toStageId)
        },
        onError: (e) => toast.error(e),
      },
    )
  }

  const pipelineStages = selected.retired ? [...view.active, selected] : view.active

  return (
    <main className="crm-page">
      <div className="crm-job__top">
        <JobTitleBar job={data} view={view} timezone={org?.timezone} />
        <div className="crm-job__pipeline-sticky">
          <PipelineBar
            stages={pipelineStages}
            currentStageId={data.stageId}
            selectedStageId={selected.id}
            onSelect={selectStage}
            onToggleStage={toggleStage}
            meta={stageMeta}
            label={`${view.terms.opportunity} stages`}
          />
        </div>
      </div>

      <div className="crm-job__layout">
        <aside className="crm-job__aside">
          <ContactCard job={data} contact={contact.data} ctx={ctx} onSchedule={() => setScheduling(true)} />
        </aside>
        <div className="crm-job__main">
          <StageWorkspace
            stage={selected}
            ctx={ctx}
            resources={resources.data ?? []}
            onSelectStage={selectStage}
          />
          <ActivityRiver
            key={data.id}
            base={{ opportunityId: data.id }}
            view={view}
            title={view.terms.activity}
            stageFilter={{ stageId: selected.id, label: selected.label }}
            composer={<JobComposer job={data} stageId={selected.id} view={view} />}
            showSubject={false}
            timezone={org?.timezone}
            emptyText="Nothing logged yet"
          />
        </div>
      </div>

      {email ? <EmailModal request={email} onClose={() => setEmail(null)} /> : null}
      {scheduling ? (
        <ScheduleOverlay
          ctx={{ ...ctx, stageId: scheduleStage.id }}
          appointmentId={null}
          kind={view.def.fields.find((f) => f.type === 'appointment' && scheduleStage.fieldIds.includes(f.id))?.appointmentKind}
          onClose={() => setScheduling(false)}
        />
      ) : null}
    </main>
  )
}

/** Date each stage was last entered, for the pipeline bar (latest transition wins). */
function stageReachedDates(transitions: OpportunityDetail['transitions'], timezone?: string) {
  const meta: Record<string, string> = {}
  for (const t of [...transitions].reverse()) {
    if (t.kind !== 'STATUS') meta[t.toStageId] = dateOnly(t.occurredAt, timezone) ?? ''
  }
  return meta
}

/**
 * Pipeline toggle: clicking a stage ahead of the current one confirms up to it (never past);
 * clicking a confirmed stage unconfirms it and everything after, moving back one stage.
 */
function stageToggleMove(active: WorkflowView['active'], currentIdx: number, stageId: string) {
  const targetIndex = active.findIndex((s) => s.id === stageId)
  if (targetIndex < 0) return null
  if (targetIndex > currentIdx) return { toStageId: stageId, message: `Confirmed ${active[targetIndex]!.label}` }
  if (targetIndex === 0 && currentIdx === 0) return null
  const back = (targetIndex > 0 ? active[targetIndex - 1] : active[0]) ?? active[0]
  if (!back) return null
  return { toStageId: back.id, message: `Unconfirmed stages in front of ${back.label}` }
}

function JobTitleBar({ job, view, timezone }: { job: OpportunityDetail; view: WorkflowView; timezone?: string }) {
  return (
    <div className="crm-job__titlebar">
      <div className="stack gap-1">
        <Link to="/contacts" className="row gap-1 text text--sm text--muted">
          <ChevronLeft size={14} aria-hidden /> Contacts
        </Link>
        <div className="row row--wrap gap-3 items-center">
          <h1 className="heading heading--2">{job.contact.name}</h1>
          {job.status !== 'OPEN' ? <Badge tone={statusTone(job.status)}>{statusLabel(job.status)}</Badge> : null}
        </div>
        <span className="text text--sm text--muted">
          {job.title && job.title !== job.contact.name ? `${job.title} · ` : ''}
          {job.propertyAddress ? `${job.propertyAddress} · ` : ''}
          {view.terms.opportunity.toLowerCase()} opened {dateOnly(job.leadReceivedAt, timezone)}
        </span>
      </div>
    </div>
  )
}

function JobSkeleton() {
  return (
    <main className="crm-page" aria-busy>
      <div className="crm-job__top">
        <Skeleton width={280} height={32} />
        <Skeleton height={40} />
      </div>
      <div className="crm-job__layout">
        <Skeleton height={420} />
        <div className="stack gap-6">
          <Skeleton height={260} />
          <Skeleton height={200} />
        </div>
      </div>
    </main>
  )
}
