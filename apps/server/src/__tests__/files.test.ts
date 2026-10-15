import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, key, makeJob, useApp } from './helpers'

const t = useApp()

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

function multipart(file: Buffer, filename: string, mime: string) {
  const boundary = '----riverlytest'
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { payload: body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

async function upload(query: string, headers: any, file = PNG, name = 'roof.png', mime = 'image/png') {
  const m = multipart(file, name, mime)
  return t.app.inject({ method: 'POST', url: `/attachments${query}`, headers: { ...headers, ...m.headers }, payload: m.payload })
}

describe('uploadAttachment', () => {
  it('requires auth', async () => {
    const res = await upload('', {})
    expect(res.statusCode).toBe(401)
  })
  it('stores once, links to the Inspection stage field and appears in job Activity', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const res = await upload(`?opportunityId=${job.id}&fieldId=inspection_photos`, t.world.a.member.headers)
    expect(res.statusCode).toBe(201)
    const ref = res.json().data
    expect(ref).toMatchObject({ stageId: 'inspection', fieldId: 'inspection_photos', mimeType: 'image/png' })
    const detail = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(detail.data.attachments.map((a: any) => a.attachmentId)).toEqual([ref.attachmentId])
    const feed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}&stageId=inspection`, headers: t.world.a.member.headers }, 200)
    expect(feed.data[0].attachments[0].attachmentId).toBe(ref.attachmentId)
    expect(await db.attachment.count({ where: { id: ref.attachmentId } })).toBe(1)
    // Signed download works and returns the same bytes.
    const url = new URL(ref.url)
    const dl = await t.app.inject({ method: 'GET', url: url.pathname + url.search })
    expect(dl.statusCode).toBe(200)
    expect(dl.rawPayload.equals(PNG)).toBe(true)
  })
  it('a composer upload links to the note it is attached to, not a separate event', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const res = await upload('', t.world.a.member.headers)
    const att = res.json().data
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'note', note: 'Photo of flashing', attachmentIds: [att.attachmentId], idempotencyKey: key() } }, 201)
    expect(await db.activityEvent.count({ where: { opportunityId: job.id, type: 'file.uploaded' } })).toBe(0)
    const feed = await call(t.app, 'listActivity', { method: 'GET', url: `/activity?opportunityId=${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(feed.data[0].attachments).toHaveLength(1)
  })
  it('rejects mismatched content and unsupported types', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    expect((await upload(`?opportunityId=${job.id}`, t.world.a.member.headers, Buffer.from('not an image'), 'x.png', 'image/png')).statusCode).toBe(415)
    expect((await upload(`?opportunityId=${job.id}`, t.world.a.member.headers, Buffer.from('MZ'), 'x.exe', 'application/x-msdownload')).statusCode).toBe(415)
  })
  it('cannot attach files to another company’s job', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    expect((await upload(`?opportunityId=${job.id}`, t.world.b.owner.headers)).statusCode).toBe(404)
  })
  it('cannot link another company’s pending upload to a note', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const theirs = (await upload('', t.world.b.owner.headers)).json().data
    await call(t.app, 'logActivity', { method: 'POST', url: `/opportunities/${job.id}/activities`, headers: t.world.a.member.headers, payload: { kind: 'note', note: 'x', attachmentIds: [theirs.attachmentId], idempotencyKey: key() } }, 422)
  })
})

describe('removeAttachmentLink', () => {
  it('requires auth', async () => {
    await call(t.app, 'removeAttachmentLink', { method: 'DELETE', url: '/attachment-links/x' }, 401)
  })
  it('unlinks without destroying the stored file', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const ref = (await upload(`?opportunityId=${job.id}&fieldId=inspection_report`, t.world.a.member.headers)).json().data
    await call(t.app, 'removeAttachmentLink', { method: 'DELETE', url: `/attachment-links/${ref.id}`, headers: t.world.b.owner.headers }, 404)
    await call(t.app, 'removeAttachmentLink', { method: 'DELETE', url: `/attachment-links/${ref.id}`, headers: t.world.a.member.headers }, 200)
    expect(await db.attachment.count({ where: { id: ref.attachmentId } })).toBe(1)
  })
})

describe('downloadFile', () => {
  it('rejects a forged or expired signature', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const ref = (await upload(`?opportunityId=${job.id}&fieldId=inspection_report`, t.world.a.member.headers)).json().data
    const url = new URL(ref.url)
    url.searchParams.set('signature', 'forged')
    await call(t.app, 'downloadFile', { method: 'GET', url: url.pathname + url.search }, 403)
    await call(t.app, 'downloadFile', { method: 'GET', url: `/files/${ref.attachmentId}?expires=1&signature=x` }, 403)
  })
})
