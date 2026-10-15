import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateCompany } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Notice } from '@/components/patterns/States'
import { AuthFrame } from '../components/AuthFrame'

/** Licensed company onboarding: creates the company, its owner and the roofing workflow. */
export default function SignupView() {
  const create = useCreateCompany()
  const navigate = useNavigate()
  const [form, setForm] = useState({ companyName: '', displayName: '', email: '', password: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate({ ...form, timezone }, { onSuccess: () => navigate('/contacts', { replace: true }) })
  }

  return (
    <AuthFrame title="Set up your company" subtitle="Staff join later by invitation." footer={<>Already have an account? <Link className="link" to="/login">Sign in</Link></>}>
      <form className="stack gap-4" onSubmit={submit}>
        {create.error ? <Notice tone="danger">{create.error.message}</Notice> : null}
        <Field label="Company name">{(id) => <Input id={id} value={form.companyName} onChange={set('companyName')} required minLength={2} autoFocus />}</Field>
        <Field label="Your name">{(id) => <Input id={id} value={form.displayName} onChange={set('displayName')} required autoComplete="name" />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set('email')} required autoComplete="email" />}</Field>
        <Field label="Password" hint="At least 10 characters">
          {(id) => <Input id={id} type="password" value={form.password} onChange={set('password')} required minLength={10} autoComplete="new-password" />}
        </Field>
        <Button type="submit" variant="primary" block loading={create.isPending}>
          Create company
        </Button>
      </form>
    </AuthFrame>
  )
}
