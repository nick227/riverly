import { describe, expect, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

describe('getOrganization', () => {
  it('requires auth', async () => {
    await call(t.app, 'getOrganization', { method: 'GET', url: '/organization' }, 401)
  })
  it('returns only the caller’s company', async () => {
    const body = await call(t.app, 'getOrganization', { method: 'GET', url: '/organization', headers: t.world.b.owner.headers }, 200)
    expect(body.data.name).toBe('Other Roofing')
  })
})

describe('updateOrganization', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateOrganization', { method: 'PATCH', url: '/organization', payload: {} }, 401)
  })
  it('is admin-only', async () => {
    await call(t.app, 'updateOrganization', { method: 'PATCH', url: '/organization', headers: t.world.a.manager.headers, payload: { name: 'Nope' } }, 403)
  })
  it('updates company identity and review link', async () => {
    const body = await call(t.app, 'updateOrganization', {
      method: 'PATCH',
      url: '/organization',
      headers: t.world.a.admin.headers,
      payload: { name: 'Acme Roofing Co', reviewUrl: 'https://g.page/r/acme', timezone: 'America/Phoenix' },
    }, 200)
    expect(body.data).toMatchObject({ name: 'Acme Roofing Co', timezone: 'America/Phoenix' })
  })
  it('rejects an unknown timezone', async () => {
    await call(t.app, 'updateOrganization', { method: 'PATCH', url: '/organization', headers: t.world.a.admin.headers, payload: { timezone: 'Mars/Base' } }, 422)
  })
})
