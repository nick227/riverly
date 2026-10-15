import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, useApp } from './helpers'

const t = useApp()

async function slugOf(userId: string) {
  return (await db.user.findUniqueOrThrow({ where: { id: userId } })).slug
}

describe('updateMyProfile', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateMyProfile', { method: 'PATCH', url: '/profiles/me', payload: {} }, 401)
  })
  it('edits own presentation and custom URL; taken slugs are refused', async () => {
    const body = await call(t.app, 'updateMyProfile', { method: 'PATCH', url: '/profiles/me', headers: t.world.a.member.headers, payload: { slug: 'sam-roofs', title: 'Sales lead', bio: 'Ten years on roofs.' } }, 200)
    expect(body.data).toMatchObject({ slug: 'sam-roofs', title: 'Sales lead' })
    await call(t.app, 'updateMyProfile', { method: 'PATCH', url: '/profiles/me', headers: t.world.a.manager.headers, payload: { slug: 'sam-roofs' } }, 409)
  })
})

describe('getProfile', () => {
  it('requires auth', async () => {
    await call(t.app, 'getProfile', { method: 'GET', url: '/profiles/x' }, 401)
  })
  it('is visible to coworkers but not to other companies', async () => {
    const body = await call(t.app, 'getProfile', { method: 'GET', url: '/profiles/sam-roofs', headers: t.world.a.manager.headers }, 200)
    expect(body.data.user.displayName).toBe('Sam Sales')
    expect(body.data.isSelf).toBe(false)
    await call(t.app, 'getProfile', { method: 'GET', url: '/profiles/sam-roofs', headers: t.world.b.owner.headers }, 404)
  })
})

describe('listRecognitionTypes', () => {
  it('requires auth', async () => {
    await call(t.app, 'listRecognitionTypes', { method: 'GET', url: '/recognition-types' }, 401)
  })
})

describe('giveRecognition', () => {
  it('requires auth', async () => {
    await call(t.app, 'giveRecognition', { method: 'POST', url: '/recognitions', payload: { recipientUserId: 'x', typeId: 'x' } }, 401)
  })
  it('records provenance and shows on the profile and in Team activity', async () => {
    const types = await call(t.app, 'listRecognitionTypes', { method: 'GET', url: '/recognition-types', headers: t.world.a.manager.headers }, 200)
    const rec = await call(t.app, 'giveRecognition', { method: 'POST', url: '/recognitions', headers: t.world.a.manager.headers, payload: { recipientUserId: t.world.a.member.id, typeId: types.data[0].id, note: 'Saved the Hale job' } }, 201)
    expect(rec.data.giver.id).toBe(t.world.a.manager.id)
    const profile = await call(t.app, 'getProfile', { method: 'GET', url: `/profiles/${await slugOf(t.world.a.member.id)}`, headers: t.world.a.member.headers }, 200)
    expect(profile.data.recognitions[0].note).toBe('Saved the Hale job')
    expect(profile.data.highlights[0].type).toBe('recognition.given')
    const team = await call(t.app, 'listActivity', { method: 'GET', url: '/activity?filter=team', headers: t.world.a.member.headers }, 200)
    expect(team.data[0].recognition.recipient.id).toBe(t.world.a.member.id)
  })
  it('cannot recognize yourself or someone in another company', async () => {
    const types = await call(t.app, 'listRecognitionTypes', { method: 'GET', url: '/recognition-types', headers: t.world.a.manager.headers }, 200)
    await call(t.app, 'giveRecognition', { method: 'POST', url: '/recognitions', headers: t.world.a.manager.headers, payload: { recipientUserId: t.world.a.manager.id, typeId: types.data[0].id } }, 422)
    await call(t.app, 'giveRecognition', { method: 'POST', url: '/recognitions', headers: t.world.a.manager.headers, payload: { recipientUserId: t.world.b.owner.id, typeId: types.data[0].id } }, 422)
  })
})
