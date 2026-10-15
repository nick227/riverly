import { PageState } from '@/components/patterns/States'
import { useSession } from '@/lib/session'
import { ActivityRiver } from '../components/ActivityRiver'
import { AttentionPanel } from '../components/AttentionPanel'
import { PostComposer } from '../components/Composers'
import { useWorkflowView } from '../config/workflow'

/**
 * Company-wide river: work events, messages, team posts, recognition and system outcomes.
 * Managers also get a "Needs attention" rail (unassigned, untouched, overdue, quiet jobs,
 * appointments and workload) beside it.
 */
export default function ActivityView() {
  const { view } = useWorkflowView()
  const { org, can } = useSession()
  if (!view) return <PageState />
  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">{view.terms.activity}</h1>
        </div>
      </div>
      {can('manage.view') ? (
        <div className="crm-activity-page">
          <ActivityRiver base={{}} view={view} composer={<PostComposer />} showFilters timezone={org?.timezone} />
          <AttentionPanel view={view} timezone={org?.timezone} />
        </div>
      ) : (
        <ActivityRiver base={{}} view={view} composer={<PostComposer />} showFilters centered timezone={org?.timezone} />
      )}
    </main>
  )
}
