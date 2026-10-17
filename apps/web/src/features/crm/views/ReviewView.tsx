import { useNavigate } from 'react-router-dom'
import type { ReviewItem } from '@project/sdk'
import { useResolveReview, useReviewQueue } from '@project/sdk'
import { Button, ButtonLink } from '@/components/primitives/Controls'
import { Badge } from '@/components/patterns/Badge'
import { Card } from '@/components/patterns/Card'
import { EmptyState, ErrorState, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { dateTime } from '@/lib/format'
import { usePageTitle } from '@/lib/pageTitle'

/** Human decisions for possible duplicates. The original submission is always preserved. */
export default function ReviewView() {
  const queue = useReviewQueue()

  usePageTitle({
    pageName: 'Review Matches',
    context: 'Lead Intake Queue',
    description: 'Review potential duplicate customer leads and resolve matches before processing in Riverly CRM.',
  })
  return (
    <main className="crm-page crm-page--narrow">
      <div className="crm-page__header">
        <div className="crm-page__title">
          <h1 className="heading heading--2">Review possible matches</h1>
          <p className="text text--muted">Two people can share a phone or email, so these leads wait for a person to decide.</p>
        </div>
        <ButtonLink to="/contacts" variant="ghost">
          Back to contacts
        </ButtonLink>
      </div>
      {queue.isLoading ? (
        <SkeletonList rows={3} height={140} />
      ) : queue.error ? (
        <ErrorState error={queue.error} />
      ) : !queue.data?.length ? (
        <Card>
          <EmptyState title="Nothing to review." action={<ButtonLink size="sm" to="/contacts">Back to contacts</ButtonLink>} />
        </Card>
      ) : (
        <div className="stack gap-4">
          {queue.data.map((item) => (
            <ReviewCard key={item.sourceRecordId} item={item} />
          ))}
        </div>
      )}
    </main>
  )
}

function ReviewCard({ item }: { item: ReviewItem }) {
  const resolve = useResolveReview()
  const navigate = useNavigate()
  const raw = item.rawPayload as Record<string, unknown>
  const message = typeof raw.message === 'string' ? raw.message : null
  const act = (action: 'link' | 'create' | 'reject', contactId?: string) =>
    resolve.mutate(
      { id: item.sourceRecordId, action, contactId: contactId ?? null, createJob: action !== 'reject' },
      {
        onSuccess: (r) => {
          toast.success(action === 'reject' ? 'Dismissed' : action === 'link' ? 'Linked as a new job' : 'New contact created')
          if (r.opportunityId) navigate(`/jobs/${r.opportunityId}`)
        },
        onError: (e) => toast.error(e),
      },
    )
  return (
    <Card className="stack gap-4">
      <div className="row row--between row--wrap gap-2">
        <div className="stack gap-1">
          <span className="text text--strong">{item.proposed.name}</span>
          <span className="text text--sm text--muted">{[item.proposed.email, item.proposed.phone].filter(Boolean).join(' · ')}</span>
        </div>
        <span className="row gap-2">
          <Badge tone="outline">{item.sourceName}</Badge>
          <span className="text text--xs text--muted">{dateTime(item.receivedAt)}</span>
        </span>
      </div>
      {message ? <p className="text text--sm text--secondary">“{message}”</p> : null}
      <div className="stack gap-2">
        <span className="field__label">Possible existing contacts</span>
        {item.candidates.map((c) => (
          <div key={c.contact.id} className="row row--between gap-2 card card--compact">
            <div className="stack gap-1">
              <span className="text text--sm text--medium">{c.contact.name}</span>
              <span className="text text--xs text--muted">
                {[c.contact.email, c.contact.phone].filter(Boolean).join(' · ')} — matches {c.matchedOn.join(' & ')}
              </span>
            </div>
            <Button size="sm" onClick={() => act('link', c.contact.id)} loading={resolve.isPending}>
              Same person — add job
            </Button>
          </div>
        ))}
      </div>
      <div className="action-bar">
        <Button variant="primary" size="sm" onClick={() => act('create')} loading={resolve.isPending}>
          Different person — create contact
        </Button>
        <Button variant="ghost" size="sm" onClick={() => act('reject')}>
          Not a lead (spam/test)
        </Button>
      </div>
    </Card>
  )
}
