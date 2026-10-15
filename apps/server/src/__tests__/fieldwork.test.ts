import { db } from '@project/db'
import { describe, expect, it } from 'vitest'
import { call, makeJob, useApp } from './helpers'

const t = useApp()

async function inspector(headers: any, name = 'Ivan Inspector') {
  return (await call(t.app, 'createExternalPerson', { method: 'POST', url: '/external-people', headers, payload: { displayName: name, companyName: 'Third Party Inspections' } }, 201)).data
}

describe('createAppointment', () => {
  it('requires auth', async () => {
    await call(t.app, 'createAppointment', { method: 'POST', url: '/opportunities/x/appointments', payload: { stageId: 'inspection', startsAt: new Date().toISOString() } }, 401)
  })
  it('schedules an inspection with a third-party inspector who gets no login', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const ivan = await inspector(t.world.a.member.headers)
    const appt = await call(t.app, 'createAppointment', {
      method: 'POST',
      url: `/opportunities/${job.id}/appointments`,
      headers: t.world.a.member.headers,
      payload: { stageId: 'inspection', startsAt: new Date(Date.now() + 86_400_000).toISOString(), externalPersonId: ivan.id },
    }, 201)
    expect(appt.data).toMatchObject({ kind: 'inspection', status: 'SCHEDULED', externalPerson: { displayName: 'Ivan Inspector' } })
    expect(await db.user.count({ where: { displayName: 'Ivan Inspector' } })).toBe(0)
  })
  it('cannot use another company’s inspector', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const theirs = await inspector(t.world.b.owner.headers, 'Theirs')
    await call(t.app, 'createAppointment', { method: 'POST', url: `/opportunities/${job.id}/appointments`, headers: t.world.a.member.headers, payload: { stageId: 'inspection', startsAt: new Date().toISOString(), externalPersonId: theirs.id } }, 422)
  })
})

describe('updateAppointment', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateAppointment', { method: 'PATCH', url: '/appointments/x', payload: {} }, 401)
  })
  it('reschedule and completion keep history as separate events', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const appt = await call(t.app, 'createAppointment', { method: 'POST', url: `/opportunities/${job.id}/appointments`, headers: t.world.a.member.headers, payload: { stageId: 'inspection', startsAt: new Date(Date.now() + 86_400_000).toISOString() } }, 201)
    await call(t.app, 'updateAppointment', { method: 'PATCH', url: `/appointments/${appt.data.id}`, headers: t.world.a.member.headers, payload: { startsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), reason: 'Rain' } }, 200)
    await call(t.app, 'updateAppointment', { method: 'PATCH', url: `/appointments/${appt.data.id}`, headers: t.world.a.member.headers, payload: { status: 'COMPLETED' } }, 200)
    const types = (await db.activityEvent.findMany({ where: { opportunityId: job.id, type: { startsWith: 'appointment.' } }, orderBy: { recordedAt: 'asc' } })).map((e) => e.type)
    expect(types).toEqual(['appointment.scheduled', 'appointment.rescheduled', 'appointment.completed'])
    await call(t.app, 'updateAppointment', { method: 'PATCH', url: `/appointments/${appt.data.id}`, headers: t.world.b.owner.headers, payload: { status: 'CANCELED' } }, 404)
  })
})

describe('addParticipant', () => {
  it('requires auth', async () => {
    await call(t.app, 'addParticipant', { method: 'POST', url: '/opportunities/x/participants', payload: { roleKey: 'inspector' } }, 401)
  })
  it('adds an external crew member or a team member, never both', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const crew = await inspector(t.world.a.member.headers, 'Carlos Crew')
    await call(t.app, 'addParticipant', { method: 'POST', url: `/opportunities/${job.id}/participants`, headers: t.world.a.member.headers, payload: { roleKey: 'crew', externalPersonId: crew.id, memberUserId: t.world.a.member.id } }, 422)
    const p = await call(t.app, 'addParticipant', { method: 'POST', url: `/opportunities/${job.id}/participants`, headers: t.world.a.member.headers, payload: { roleKey: 'crew', stageId: 'started', externalPersonId: crew.id } }, 201)
    expect(p.data.externalPerson.displayName).toBe('Carlos Crew')
  })
})

describe('removeParticipant', () => {
  it('requires auth', async () => {
    await call(t.app, 'removeParticipant', { method: 'DELETE', url: '/participants/x' }, 401)
  })
  it('removes from the job but keeps the history', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const p = await call(t.app, 'addParticipant', { method: 'POST', url: `/opportunities/${job.id}/participants`, headers: t.world.a.member.headers, payload: { roleKey: 'inspector', memberUserId: t.world.a.manager.id } }, 201)
    await call(t.app, 'removeParticipant', { method: 'DELETE', url: `/participants/${p.data.id}`, headers: t.world.a.member.headers }, 200)
    const detail = await call(t.app, 'getOpportunity', { method: 'GET', url: `/opportunities/${job.id}`, headers: t.world.a.member.headers }, 200)
    expect(detail.data.participants).toHaveLength(0)
    expect(await db.opportunityParticipant.count({ where: { id: p.data.id } })).toBe(1)
  })
})

describe('createExternalLink', () => {
  it('requires auth', async () => {
    await call(t.app, 'createExternalLink', { method: 'POST', url: '/opportunities/x/external-links', payload: { kind: 'INVOICE', label: 'x' } }, 401)
  })
  it('records an external invoice URL as MANUAL (unverified)', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const body = await call(t.app, 'createExternalLink', {
      method: 'POST',
      url: `/opportunities/${job.id}/external-links`,
      headers: t.world.a.member.headers,
      payload: { kind: 'INVOICE', label: 'Final invoice', url: 'https://pay.example.com/inv/42', amountCents: 1_420_000, statusLabel: 'Sent' },
    }, 201)
    expect(body.data).toMatchObject({ provenance: 'MANUAL', statusLabel: 'Sent' })
  })
})

describe('updateExternalLink', () => {
  it('requires auth', async () => {
    await call(t.app, 'updateExternalLink', { method: 'PATCH', url: '/external-links/x', payload: {} }, 401)
  })
  it('records manual status changes with a timestamp and never touches the stage', async () => {
    const { job } = await makeJob(t.app, t.world.a.member.headers)
    const link = await call(t.app, 'createExternalLink', { method: 'POST', url: `/opportunities/${job.id}/external-links`, headers: t.world.a.member.headers, payload: { kind: 'PAYMENT', label: 'Deposit' } }, 201)
    const upd = await call(t.app, 'updateExternalLink', { method: 'PATCH', url: `/external-links/${link.data.id}`, headers: t.world.a.member.headers, payload: { statusLabel: 'Paid' } }, 200)
    expect(upd.data.statusRecordedAt).toBeTruthy()
    expect((await db.opportunity.findUniqueOrThrow({ where: { id: job.id } })).stageId).toBe('lead')
  })
})

describe('listExternalPeople', () => {
  it('requires auth', async () => {
    await call(t.app, 'listExternalPeople', { method: 'GET', url: '/external-people' }, 401)
  })
  it('only lists this company’s people', async () => {
    await inspector(t.world.b.owner.headers, 'Zed Elsewhere')
    const body = await call(t.app, 'listExternalPeople', { method: 'GET', url: '/external-people?q=Zed', headers: t.world.a.member.headers }, 200)
    expect(body.data).toHaveLength(0)
  })
})

describe('createExternalPerson', () => {
  it('requires auth', async () => {
    await call(t.app, 'createExternalPerson', { method: 'POST', url: '/external-people', payload: { displayName: 'x' } }, 401)
  })
})
