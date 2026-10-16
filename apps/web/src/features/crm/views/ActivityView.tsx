import { PageState } from '@/components/patterns/States'
import { useSession } from '@/lib/session'
import { ActivityRiver } from '../components/ActivityRiver'
import { PostComposer } from '../components/Composers'
import { SalesBoard } from '../components/SalesBoard'
import { useWorkflowView } from '../config/workflow'

/**
 * Company-wide river: work events, messages, team posts, recognition and system outcomes,
 * with the live sales board beside it for everyone. Follow-up lists live on Contacts.
 */
export default function ActivityView() {
  const { view } = useWorkflowView()
  const { org } = useSession()
  if (!view) return <PageState />
  return (
    <main className="crm-page">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--1">{view.terms.activity}</h1>
        </div>
      </div>
      <div className="crm-activity-page">
        <ActivityRiver base={{}} view={view} composer={<PostComposer />} showFilters timezone={org?.timezone} />
        <SalesBoard view={view} />
      </div>
    </main>
  )
}
