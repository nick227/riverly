import { useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { usePublicForm, useSubmitPublicForm } from '@project/sdk'
import { Button, Input, Textarea } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Notice, PageState } from '@/components/patterns/States'
import { useEntityTitle } from '@/lib/pageTitle'

/** Embeddable lead form (iframe this route on a company website). No app chrome. */
export default function PublicFormView() {
  const { token = '' } = useParams()
  const form = usePublicForm(token)
  const submit = useSubmitPublicForm(token)
  const startedAt = useMemo(() => Date.now(), [])
  const [v, setV] = useState({ name: '', email: '', phone: '', address: '', service: '', message: '', website: '', consent: false })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value })

  const companyName = form.data?.companyName
  useEntityTitle(
    {
      type: 'form',
      name: companyName,
      description: companyName
        ? `Request a free roofing estimate from ${companyName}. Fast turnaround and transparent estimates.`
        : null,
    },
    [companyName],
  )

  if (form.isLoading) return <PageState />
  if (!form.data)
    return (
      <main className="crm-page crm-page--narrow">
        <Notice tone="warning">This form is not available.</Notice>
      </main>
    )

  if (submit.isSuccess)
    return (
      <main className="crm-page crm-page--narrow">
        <div className="card stack gap-2">
          <h1 className="heading heading--3">Thank you</h1>
          <p className="text text--secondary">{form.data.successMessage ?? `${form.data.companyName} will be in touch shortly.`}</p>
        </div>
      </main>
    )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit.mutate({
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      address: v.address || null,
      service: v.service || null,
      message: v.message || null,
      consent: v.consent,
      website: v.website || null,
      startedAt,
    })
  }

  return (
    <main className="crm-page crm-page--narrow">
      <form className="card stack gap-4" onSubmit={onSubmit}>
        <div className="stack gap-1">
          <h1 className="heading heading--3">{form.data.headline ?? `Contact ${form.data.companyName}`}</h1>
          <p className="text text--sm text--muted">{form.data.companyName}</p>
        </div>
        {submit.error ? <Notice tone="danger">{submit.error.message}</Notice> : null}
        <Field label="Name">{(id) => <Input id={id} value={v.name} onChange={set('name')} required autoComplete="name" />}</Field>
        <div className="grid grid--2 gap-4">
          <Field label="Email">{(id) => <Input id={id} type="email" value={v.email} onChange={set('email')} autoComplete="email" />}</Field>
          <Field label="Phone">{(id) => <Input id={id} type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" />}</Field>
        </div>
        <Field label="Property address">{(id) => <Input id={id} value={v.address} onChange={set('address')} autoComplete="street-address" />}</Field>
        <Field label="What do you need?">{(id) => <Input id={id} value={v.service} onChange={set('service')} placeholder="Roof repair, replacement, inspection…" />}</Field>
        <Field label="Details">{(id) => <Textarea id={id} value={v.message} onChange={set('message')} rows={4} />}</Field>
        {/* Honeypot: hidden from people, filled by bots. */}
        <div className="visually-hidden" aria-hidden>
          <label>
            Website <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} />
          It’s okay to contact me about this request by phone, text or email.
        </label>
        <Button type="submit" variant="primary" loading={submit.isPending} disabled={!v.name || (!v.email && !v.phone)}>
          Send request
        </Button>
      </form>
    </main>
  )
}
