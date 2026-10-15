import bcrypt from 'bcryptjs'
import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

async function userWithPassword(email: string, password: string) {
  return db.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 4), displayName: 'Pat Login', slug: `pat-${Date.now()}` } })
}

describe('login', () => {
  it('sets an httpOnly session cookie and returns memberships', async () => {
    const u = await userWithPassword('pat@test.local', 'correct horse battery')
    await db.membership.create({ data: { organizationId: t.world.a.org.id, userId: u.id, role: 'MEMBER' } })
    const res = await t.app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'PAT@test.local', password: 'correct horse battery' } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['set-cookie']).toMatch(/token=.*HttpOnly/i)
    expect(res.json().data.organization.id).toBe(t.world.a.org.id)
    expect(res.json().data.role).toBe('MEMBER')
  })
  it('rejects a wrong password without revealing whether the account exists', async () => {
    const a = await call(t.app, 'login', { method: 'POST', url: '/auth/login', payload: { email: 'pat@test.local', password: 'nope' } }, 401)
    const b = await call(t.app, 'login', { method: 'POST', url: '/auth/login', payload: { email: 'ghost@test.local', password: 'nope' } }, 401)
    expect(a.error).toBe(b.error)
  })
})

describe('logout', () => {
  it('requires auth', async () => {
    await call(t.app, 'logout', { method: 'POST', url: '/auth/logout' }, 401)
  })
  it('revokes the session', async () => {
    const { AuthService } = await import('../services/AuthService')
    const token = await new AuthService().createSession(t.world.a.member.id, t.world.a.org.id)
    const headers = { authorization: `Bearer ${token}` }
    await call(t.app, 'logout', { method: 'POST', url: '/auth/logout', headers }, 200)
    await call(t.app, 'getCurrentUser', { method: 'GET', url: '/auth/me', headers }, 401)
  })
})

describe('getCurrentUser', () => {
  it('requires auth', async () => {
    await call(t.app, 'getCurrentUser', { method: 'GET', url: '/auth/me' }, 401)
  })
  it('returns the active company and role', async () => {
    const body = await call(t.app, 'getCurrentUser', { method: 'GET', url: '/auth/me', headers: t.world.a.manager.headers }, 200)
    expect(body.data.role).toBe('MANAGER')
    expect(body.data).not.toHaveProperty('passwordHash')
  })
  it('stops working as soon as the membership is deactivated', async () => {
    const { AuthService } = await import('../services/AuthService')
    const u = await db.user.create({ data: { email: 'temp@test.local', passwordHash: 'x', displayName: 'Temp', slug: 'temp-user' } })
    await db.membership.create({ data: { organizationId: t.world.a.org.id, userId: u.id, role: 'MEMBER', status: 'DEACTIVATED' } })
    const token = await new AuthService().createSession(u.id, t.world.a.org.id)
    const body = await call(t.app, 'getCurrentUser', { method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } }, 200)
    expect(body.data.organization).toBeNull()
    await call(t.app, 'listContacts', { method: 'GET', url: '/contacts', headers: { authorization: `Bearer ${token}` } }, 403)
  })
})

describe('switchOrganization', () => {
  it('requires auth', async () => {
    await call(t.app, 'switchOrganization', { method: 'POST', url: '/auth/switch-organization', payload: { organizationId: 'x' } }, 401)
  })
  it('refuses a company the user does not belong to', async () => {
    await call(t.app, 'switchOrganization', { method: 'POST', url: '/auth/switch-organization', headers: t.world.a.member.headers, payload: { organizationId: t.world.b.org.id } }, 403)
  })
  it('switches between companies the user belongs to', async () => {
    await db.membership.create({ data: { organizationId: t.world.b.org.id, userId: t.world.a.member.id, role: 'MANAGER' } })
    const body = await call(t.app, 'switchOrganization', { method: 'POST', url: '/auth/switch-organization', headers: t.world.a.member.headers, payload: { organizationId: t.world.b.org.id } }, 200)
    expect(body.data.role).toBe('MANAGER')
    await call(t.app, 'switchOrganization', { method: 'POST', url: '/auth/switch-organization', headers: t.world.a.member.headers, payload: { organizationId: t.world.a.org.id } }, 200)
  })
})

describe('createCompany', () => {
  it('creates a company, its owner and the roofing workflow', async () => {
    const body = await call(t.app, 'createCompany', {
      method: 'POST',
      url: '/auth/company-signup',
      payload: { companyName: 'Fresh Roofing', displayName: 'Fran Founder', email: 'fran@fresh.test', password: 'a-long-password-1' },
    }, 201)
    expect(body.data.role).toBe('OWNER')
    const versions = await db.workflowVersion.count({ where: { organizationId: body.data.organization.id } })
    const templates = await db.emailTemplate.count({ where: { organizationId: body.data.organization.id } })
    expect(versions).toBe(1)
    expect(templates).toBe(13)
  })
  it('does not let an existing account create a second login', async () => {
    await call(t.app, 'createCompany', {
      method: 'POST',
      url: '/auth/company-signup',
      payload: { companyName: 'Again Roofing', displayName: 'Fran', email: 'fran@fresh.test', password: 'a-long-password-1' },
    }, 409)
  })
})

describe('getInvitation', () => {
  it('returns 404 for an unknown token', async () => {
    await call(t.app, 'getInvitation', { method: 'GET', url: '/invitations/not-a-real-token' }, 404)
  })
})

describe('acceptInvitation', () => {
  it('creates the account, joins the company with the invited role and signs in', async () => {
    const inv = await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', headers: t.world.a.admin.headers, payload: { email: 'newhire@test.local', role: 'MEMBER' } }, 201)
    const token = inv.data.acceptUrl.split('/invite/')[1]
    const preview = await call(t.app, 'getInvitation', { method: 'GET', url: `/invitations/${token}` }, 200)
    expect(preview.data).toMatchObject({ organizationName: 'Acme Roofing', role: 'MEMBER', hasAccount: false })
    const res = await t.app.inject({ method: 'POST', url: `/invitations/${token}/accept`, payload: { displayName: 'New Hire', password: 'a-long-password-1' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.role).toBe('MEMBER')
    // Single use
    await call(t.app, 'acceptInvitation', { method: 'POST', url: `/invitations/${token}/accept`, payload: { displayName: 'New Hire', password: 'a-long-password-1' } }, 404)
  })
  it('requires the existing password when the email already has an account', async () => {
    const inv = await call(t.app, 'createInvitation', { method: 'POST', url: '/team/invitations', headers: t.world.b.owner.headers, payload: { email: 'pat@test.local', role: 'MEMBER' } }, 201)
    const token = inv.data.acceptUrl.split('/invite/')[1]
    await call(t.app, 'acceptInvitation', { method: 'POST', url: `/invitations/${token}/accept`, payload: { password: 'wrong' } }, 401)
    await call(t.app, 'acceptInvitation', { method: 'POST', url: `/invitations/${token}/accept`, payload: { password: 'correct horse battery' } }, 200)
  })
})
