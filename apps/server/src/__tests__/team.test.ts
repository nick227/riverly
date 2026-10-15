import { describe, expect, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

describe('listMembers', () => {
  it('requires auth', async () => {
    await call(t.app, 'listMembers', { method: 'GET', url: '/members' }, 401)
  })
  it('lists only this company’s members', async () => {
    const body = await call(t.app, 'listMembers', { method: 'GET', url: '/members', headers: t.world.a.member.headers }, 200)
    expect(body.data).toHaveLength(4)
    expect(body.data.map((m: any) => m.userId)).not.toContain(t.world.b.owner.id)
  })
})

describe('updateMember', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateMember', { method: 'PATCH', url: '/members/x', payload: {} }, 401)
  })
  it('lets an admin change a member to manager', async () => {
    const body = await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.admin.headers, payload: { role: 'MANAGER' } }, 200)
    expect(body.data.role).toBe('MANAGER')
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.admin.headers, payload: { role: 'MEMBER' } }, 200)
  })
  it('reserves admin grants for the owner', async () => {
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.admin.headers, payload: { role: 'ADMIN' } }, 403)
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.owner.headers, payload: { role: 'ADMIN' } }, 200)
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.owner.headers, payload: { role: 'MEMBER' } }, 200)
  })
  it('managers cannot manage the team', async () => {
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.a.member.id}`, headers: t.world.a.manager.headers, payload: { role: 'MANAGER' } }, 403)
  })
  it('cannot touch members of another company', async () => {
    await call(t.app, 'updateMember', { method: 'PATCH', url: `/members/${t.world.b.owner.id}`, headers: t.world.a.owner.headers, payload: { role: 'MEMBER' } }, 404)
  })
})

describe('listInvitations', () => {
  it('requires auth', async () => {
    await call(t.app, 'listInvitations', { method: 'GET', url: '/team/invitations' }, 401)
  })
  it('is admin-only', async () => {
    await call(t.app, 'listInvitations', { method: 'GET', url: '/team/invitations', headers: t.world.a.member.headers }, 403)
    await call(t.app, 'listInvitations', { method: 'GET', url: '/team/invitations', headers: t.world.a.admin.headers }, 200)
  })
})

describe('createInvitation', () => {
  it('requires auth', async () => {
    await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', payload: { email: 'a@b.co', role: 'MEMBER' } }, 401)
  })
  it('returns the accept link once and never stores the raw token', async () => {
    const body = await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', headers: t.world.a.admin.headers, payload: { email: 'crew@test.local', role: 'MEMBER' } }, 201)
    expect(body.data.acceptUrl).toMatch(/\/invite\//)
    const list = await call(t.app, 'listInvitations', { method: 'GET', url: '/team/invitations', headers: t.world.a.admin.headers }, 200)
    expect(list.data[0]).not.toHaveProperty('acceptUrl')
  })
  it('only owners can invite admins', async () => {
    await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', headers: t.world.a.admin.headers, payload: { email: 'boss@test.local', role: 'ADMIN' } }, 403)
  })
})

describe('revokeInvitation', () => {
  it('requires auth', async () => {
    await call(t.app, 'revokeInvitation', { method: 'DELETE', url: '/team/invitations/x' }, 401)
  })
  it('revokes an open invitation', async () => {
    const inv = await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', headers: t.world.a.admin.headers, payload: { email: 'later@test.local', role: 'MEMBER' } }, 201)
    await call(t.app, 'revokeInvitation', { method: 'DELETE', url: `/team/invitations/${inv.data.id}`, headers: t.world.a.admin.headers }, 200)
    const token = inv.data.acceptUrl.split('/invite/')[1]
    await call(t.app, 'getInvitation', { method: 'GET', url: `/invitations/${token}` }, 404)
  })
})
