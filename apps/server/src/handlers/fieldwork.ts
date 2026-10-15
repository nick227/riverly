import { FieldworkService } from '../services/FieldworkService'
import { ok, type Rep, type Req } from './_shared'

const fieldwork = new FieldworkService()

export const createAppointment = async (r: Req, reply: Rep) => ok(reply, await fieldwork.createAppointment(r.ctx, r.params.id, r.body), 201)
export const updateAppointment = async (r: Req, reply: Rep) => ok(reply, await fieldwork.updateAppointment(r.ctx, r.params.id, r.body))
export const addParticipant = async (r: Req, reply: Rep) => ok(reply, await fieldwork.addParticipant(r.ctx, r.params.id, r.body), 201)
export async function removeParticipant(r: Req, reply: Rep) {
  await fieldwork.removeParticipant(r.ctx, r.params.id)
  return ok(reply, null)
}
export const listExternalPeople = async (r: Req, reply: Rep) => ok(reply, await fieldwork.listExternalPeople(r.ctx, r.query.q))
export const createExternalPerson = async (r: Req, reply: Rep) => ok(reply, await fieldwork.createExternalPerson(r.ctx, r.body), 201)
export const createExternalLink = async (r: Req, reply: Rep) => ok(reply, await fieldwork.createExternalLink(r.ctx, r.params.id, r.body), 201)
export const updateExternalLink = async (r: Req, reply: Rep) => ok(reply, await fieldwork.updateExternalLink(r.ctx, r.params.id, r.body))
