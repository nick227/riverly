import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAcceptInvitation, useInvitation } from '@project/sdk'
import { Button, Input } from '@/components/primitives/Controls'
import { Field } from '@/components/patterns/Field'
import { Notice, PageState } from '@/components/patterns/States'
import { AuthFrame } from '../components/AuthFrame'
import { roleLabel } from '../config/labels'

export default function InviteView() {
  const { token = '' } = useParams()
  const invite = useInvitation(token)
  const accept = useAcceptInvitation(token)
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')

  if (invite.isLoading) return <PageState />
  if (!invite.data)
    return (
      <AuthFrame title="Invitation unavailable">
        <Notice tone="warning">This invitation has expired, was revoked, or was already used. Ask your company admin for a new one.</Notice>
      </AuthFrame>
    )
  const inv = invite.data

  function submit(e: FormEvent) {
    e.preventDefault()
    accept.mutate({ password, ...(inv.hasAccount ? {} : { displayName }) }, { onSuccess: () => navigate('/contacts', { replace: true }) })
  }

  return (
    <AuthFrame title={`Join ${inv.organizationName}`} subtitle={<>You were invited as <strong>{roleLabel(inv.role)}</strong> ({inv.email}).</>}>
      <form className="stack gap-4" onSubmit={submit}>
        {accept.error ? <Notice tone="danger">{accept.error.message}</Notice> : null}
        {inv.hasAccount ? (
          <Field label="Your Riverly password" hint="You already have an account — confirm it to join.">
            {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="current-password" />}
          </Field>
        ) : (
          <>
            <Field label="Your name">{(id) => <Input id={id} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoFocus autoComplete="name" />}</Field>
            <Field label="Choose a password" hint="At least 10 characters">
              {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" />}
            </Field>
          </>
        )}
        <Button type="submit" variant="primary" block loading={accept.isPending}>
          Join company
        </Button>
      </form>
    </AuthFrame>
  )
}
