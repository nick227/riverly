import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useContact, useOpportunity, useResources, useTransitionOpportunity } from '@project/sdk'
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
import { useWorkflowView } from '../config/workflow'

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

  const stageMeta = useMemo(() => {
    const meta: Record<string, string> = {}
    for (const t of [...(data?.transitions ?? [])].reverse()) {
      if (t.kind !== 'STATUS') meta[t.toStageId] = dateOnly(t.occurredAt, org?.timezone) ?? ''
    }
    return meta
  }, [data?.transitions, org?.timezone])

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
    const targetIndex = view.active.findIndex((s) => s.id === stageId)
    const currentIdx = view.stageIndex(data.stageId)
    if (targetIndex < 0) return

    if (targetIndex > currentIdx) {
      // Unconfirmed stage: confirm up to this stage (do not advance past it)
      transition.mutate(
        { toStageId: stageId, reason: null },
        {
          onSuccess: () => {
            toast.success(`Confirmed ${view.stageLabel(stageId)}`)
            selectStage(stageId)
          },
          onError: (e) => toast.error(e),
        },
      )
    } else {
      // Confirmed stage: unconfirm this stage and any in front of it
      if (targetIndex === 0 && currentIdx === 0) {
        return
      }
      const targetStage = (targetIndex > 0 ? view.active[targetIndex - 1] : view.active[0]) ?? view.active[0]
      if (!targetStage) return

      transition.mutate(
        { toStageId: targetStage.id, reason: null },
        {
          onSuccess: () => {
            toast.success(`Unconfirmed stages in front of ${targetStage.label}`)
            selectStage(targetStage.id)
          },
          onError: (e) => toast.error(e),
        },
      )
    }
  }

  const pipelineStages = selected.retired ? [...view.active, selected] : view.active

  return (
    <main className="crm-page">
      <div className="crm-job__top">
        <div className="crm-job__titlebar">
          <div className="stack gap-1">
            <Link to="/contacts" className="row gap-1 text text--sm text--muted">
              <ChevronLeft size={14} aria-hidden /> Contacts
            </Link>
            <div className="row row--wrap gap-3 items-center">
              <h1 className="heading heading--2">{data.contact.name}</h1>
              {data.status !== 'OPEN' ? <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge> : null}
            </div>
            <span className="text text--sm text--muted">
              {data.title && data.title !== data.contact.name ? `${data.title} · ` : ''}
              {data.propertyAddress ? `${data.propertyAddress} · ` : ''}
              {view.terms.opportunity.toLowerCase()} opened {dateOnly(data.leadReceivedAt, org?.timezone)}
            </span>
          </div>
        </div>
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
