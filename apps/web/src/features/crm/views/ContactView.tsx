import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useContact } from '@project/sdk'
import { Button } from '@/components/primitives/Controls'
import { Card } from '@/components/patterns/Card'
import { EmptyState, ErrorState, PageState } from '@/components/patterns/States'
import { dateOnly } from '@/lib/format'
import { useEntityTitle } from '@/lib/pageTitle'
import { NewJobOverlay } from '../components/ContactCard'
import { useWorkflowView } from '../config/workflow'

/** A contact opens on their most recent job; a contact without jobs offers to start one. */
export default function ContactView() {
  const { contactId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const contact = useContact(contactId)
  const { view } = useWorkflowView()
  const navigate = useNavigate()
  const addJob = params.get('addJob') === '1'

  const contactName = contact.data?.name
  useEntityTitle(
    {
      type: 'contact',
      name: contactName,
      context: 'Customer Record',
      description: contactName
        ? `Customer contact record for ${contactName}. View contact details, opportunities, and history in Riverly CRM.`
        : null,
    },
    [contactName],
  )

  if (contact.isLoading || !view) return <PageState />
  if (contact.error || !contact.data) return <div className="crm-page"><ErrorState error={contact.error} /></div>
  const c = contact.data
  const latest = c.opportunities.find((o) => o.status === 'OPEN' || o.status === 'WON') ?? c.opportunities[0]
  if (latest && !addJob) return <Navigate to={`/jobs/${latest.id}`} replace />

  return (
    <main className="crm-page crm-page--narrow">
      <Card className="stack gap-4">
        <div className="stack gap-1">
          <h1 className="heading heading--2">{c.name}</h1>
          <span className="text text--sm text--muted">
            {[c.phone, c.email].filter(Boolean).join(' · ')} · added {dateOnly(c.createdAt)}
          </span>
        </div>
        <EmptyState
          title={`${c.name} has no ${view.terms.opportunity.toLowerCase()}s yet.`}
          action={
            <Button variant="primary" onClick={() => setParams({ addJob: '1' })}>
              <Plus aria-hidden /> New {view.terms.opportunity.toLowerCase()}
            </Button>
          }
        />
      </Card>
      {addJob ? <NewJobOverlay contactId={c.id} view={view} defaultAddress={c.addressLine} onClose={() => (latest ? navigate(`/jobs/${latest.id}`) : setParams({}))} /> : null}
    </main>
  )
}
