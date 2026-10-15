import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogin } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Notice } from '@/components/patterns/States'
import { AuthFrame } from '../components/AuthFrame'

export function LoginView() {
  const me = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const from = (location.state as { from?: string } | null)?.from ?? '/contacts'

  if (me.data?.data) return <Navigate to={from} replace />

  function submit(e: FormEvent) {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <AuthFrame title="Sign in" subtitle="Riverly — lead to job, without the gaps." footer={<>New company? <Link className="link" to="/signup">Start here</Link></>}>
      <form className="stack gap-4" onSubmit={submit} noValidate>
        {login.error ? <Notice tone="danger">{login.error.message}</Notice> : null}
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />}</Field>
        <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
        <Button type="submit" variant="primary" block loading={login.isPending} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
    </AuthFrame>
  )
}
