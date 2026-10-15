import { PageState } from '@/components/patterns/States'
import { useSession } from '@/lib/session'
import { ActivityRiver } from '../components/ActivityRiver'
import { PostComposer } from '../components/Composers'
import { useWorkflowView } from '../config/workflow'

/** Company-wide river: work events, messages, team posts, recognition and system outcomes. */
export default function ActivityView() {
  const { view } = useWorkflowView()
  const { org } = useSession()
  if (!view) return <PageState />
  return (
    <main className="crm-page">
      <div className="crm-activity--centered stack gap-6" style={{ margin: '0 auto' }}>
        <div className="crm-page__title">
          <h1 className="heading heading--1">{view.terms.activity}</h1>
          <p className="text text--muted">What’s happening across {org?.name ?? 'the company'}.</p>
        </div>
        <ActivityRiver base={{}} view={view} composer={<PostComposer />} showFilters centered timezone={org?.timezone} />
      </div>
    </main>
  )
}
