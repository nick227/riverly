import { useState } from 'react'
import { Copy } from 'lucide-react'
import type { Role } from '@project/sdk'
import { useCreateInvitation, useInvitations, useMembers, useRevokeInvitation, useUpdateMember } from '@project/sdk'
import { Button, Input, Select } from '@/components/primitives/Controls'
import { Identity } from '@/components/patterns/Avatar'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { Notice, SkeletonList } from '@/components/patterns/States'
import { toast } from '@/components/patterns/Toast'
import { dateOnly } from '@/lib/format'
import { useSession } from '@/lib/session'
import { roleLabel } from '../../config/labels'

const ROLES: Role[] = ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER']

export function TeamSettings() {
  const { me, role } = useSession()
  const members = useMembers()
  const invitations = useInvitations()
  const update = useUpdateMember()
  const invite = useCreateInvitation()
  const revoke = useRevokeInvitation()
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState<Role>('MEMBER')
  const [link, setLink] = useState<string | null>(null)
  const isOwner = role === 'OWNER'
  const roleOptions = ROLES.filter((r) => isOwner || (r !== 'ADMIN' && r !== 'OWNER')).map((r) => ({ value: r, label: roleLabel(r) }))

  return (
    <div className="stack gap-6">
      <Card>
        <CardHeader title="Invite a teammate" />
        <form
          className="row row--wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            invite.mutate({ email, role: newRole }, { onSuccess: (inv) => (setLink(inv.acceptUrl ?? null), setEmail(''), toast.success('Invitation created')), onError: (err) => toast.error(err) })
          }}
        >
          <Input type="email" aria-label="Email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 320 }} />
          <Select aria-label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} options={roleOptions} style={{ width: 150 }} />
          <Button type="submit" variant="primary" loading={invite.isPending} disabled={!email}>
            Create invitation
          </Button>
        </form>
        {link ? (
          <div className="mt-4">
            <Notice>
              <div className="stack gap-2">
                <span>Send this one-time link to your teammate. It expires in 7 days and won’t be shown again.</span>
                <div className="row gap-2">
                  <Input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Invitation link" />
                  <Button size="sm" onClick={() => void navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}>
                    <Copy aria-hidden /> Copy
                  </Button>
                </div>
              </div>
            </Notice>
          </div>
        ) : null}
        <p className="text text--xs text--muted mt-4">Managers oversee work and assignments. Admins configure Riverly. Only the owner can grant admin.</p>
      </Card>

      <Card>
        <CardHeader title="Members" />
        {members.isLoading ? (
          <SkeletonList rows={3} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Person</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr>
              </thead>
              <tbody>
                {(members.data ?? []).map((m) => {
                  const editable = m.userId !== me?.id && (isOwner || (m.role !== 'ADMIN' && m.role !== 'OWNER'))
                  return (
                    <tr key={m.userId}>
                      <td><Identity name={m.displayName} src={m.avatarUrl} size="sm" secondary={m.email} slug={m.slug} /></td>
                      <td style={{ width: 160 }}>
                        {editable ? (
                          <Select size_="sm" aria-label={`Role for ${m.displayName}`} value={m.role} options={roleOptions.some((o) => o.value === m.role) ? roleOptions : [{ value: m.role, label: roleLabel(m.role) }, ...roleOptions]} onChange={(e) => update.mutate({ userId: m.userId, role: e.target.value as Role }, { onSuccess: () => toast.success('Role updated'), onError: (err) => toast.error(err) })} />
                        ) : (
                          roleLabel(m.role)
                        )}
                      </td>
                      <td><Badge tone={m.status === 'ACTIVE' ? 'success' : 'outline'}>{m.status === 'ACTIVE' ? 'Active' : 'Deactivated'}</Badge></td>
                      <td className="text--muted">{dateOnly(m.joinedAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {editable ? (
                          <Button size="sm" variant={m.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => update.mutate({ userId: m.userId, status: m.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' }, { onSuccess: () => toast.success('Access updated'), onError: (err) => toast.error(err) })}>
                            {m.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Invitations" />
        {(invitations.data ?? []).length ? (
          <div className="list">
            {invitations.data!.map((i) => {
              const state = i.acceptedAt ? 'Accepted' : i.revokedAt ? 'Revoked' : new Date(i.expiresAt) < new Date() ? 'Expired' : 'Pending'
              return (
                <div key={i.id} className="list__row">
                  <span className="text text--sm grow">{i.email}</span>
                  <span className="text text--xs text--muted">{roleLabel(i.role)}</span>
                  <Badge tone={state === 'Pending' ? 'warning' : 'outline'}>{state}</Badge>
                  {state === 'Pending' ? (
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(i.id, { onSuccess: () => toast.success('Invitation revoked'), onError: (err) => toast.error(err) })}>
                      Revoke
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text text--sm text--muted">No invitations yet.</p>
        )}
      </Card>
    </div>
  )
}
