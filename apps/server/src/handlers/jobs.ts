import { OpportunityService } from '../services/OpportunityService'
import { ok, type Rep, type Req } from './_shared'

const jobs = new OpportunityService()

export const listOpportunities = async (r: Req, reply: Rep) => reply.send(await jobs.list(r.ctx, r.query))
export const getOpportunity = async (r: Req, reply: Rep) => ok(reply, await jobs.get(r.ctx, r.params.id))
export const updateOpportunity = async (r: Req, reply: Rep) => ok(reply, await jobs.update(r.ctx, r.params.id, r.body))
export const setOpportunityField = async (r: Req, reply: Rep) =>
  ok(reply, await jobs.setField(r.ctx, r.params.id, r.params.fieldId, r.body.value))
export const transitionOpportunity = async (r: Req, reply: Rep) => ok(reply, await jobs.transition(r.ctx, r.params.id, r.body))
export const setOpportunityStatus = async (r: Req, reply: Rep) => ok(reply, await jobs.setStatus(r.ctx, r.params.id, r.body))
