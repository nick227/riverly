import { useEffect, useState } from 'react'
import { useOrganization, useUpdateOrganization } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Field } from '@/components/patterns/Field'
import { SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'

export function CompanySettings() {
  const org = useOrganization()
  const update = useUpdateOrganization()
  const [v, setV] = useState({ name: '', timezone: '', reviewUrl: '', logoUrl: '' })
  useEffect(() => {
    if (org.data) setV({ name: org.data.name, timezone: org.data.timezone, reviewUrl: org.data.reviewUrl ?? '', logoUrl: org.data.logoUrl ?? '' })
  }, [org.data])
  if (org.isLoading) return <SkeletonList rows={2} height={120} />
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <Card className="crm-page--narrow" style={{ maxWidth: 720 }}>
      <CardHeader title="Company" />
      <form
        className="stack gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          update.mutate({ name: v.name, timezone: v.timezone, reviewUrl: v.reviewUrl || null, logoUrl: v.logoUrl || null }, { onSuccess: () => toast.success('Company saved'), onError: (err) => toast.error(err) })
        }}
      >
        <Field label="Company name">{(id) => <Input id={id} value={v.name} onChange={set('name')} />}</Field>
        <Field label="Timezone" hint="Dates display in this timezone; everything is stored in UTC.">{(id) => <Input id={id} value={v.timezone} onChange={set('timezone')} placeholder="America/Denver" />}</Field>
        <Field label="Review link" hint="Where review requests send customers (Google, Yelp…). Required for Request review.">
          {(id) => <Input id={id} type="url" value={v.reviewUrl} onChange={set('reviewUrl')} placeholder="https://g.page/r/…" />}
        </Field>
        <Field label="Logo URL">{(id) => <Input id={id} type="url" value={v.logoUrl} onChange={set('logoUrl')} placeholder="https://" />}</Field>
        <div>
          <Button type="submit" variant="primary" loading={update.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  )
}
