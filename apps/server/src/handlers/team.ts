import { TeamService } from '../services/TeamService'
import { ok, type Rep, type Req } from './_shared'

const team = new TeamService()

export const getOrganization = async (r: Req, reply: Rep) => ok(reply, await team.getOrganization(r.ctx))
export const updateOrganization = async (r: Req, reply: Rep) => ok(reply, await team.updateOrganization(r.ctx, r.body))
export const listMembers = async (r: Req, reply: Rep) => ok(reply, await team.listMembers(r.ctx))
export const updateMember = async (r: Req, reply: Rep) => ok(reply, await team.updateMember(r.ctx, r.params.id, r.body))
export const listInvitations = async (r: Req, reply: Rep) => ok(reply, await team.listInvitations(r.ctx))
export const createInvitation = async (r: Req, reply: Rep) => ok(reply, await team.createInvitation(r.ctx, r.body), 201)
export async function revokeInvitation(r: Req, reply: Rep) {
  await team.revokeInvitation(r.ctx, r.params.id)
  return ok(reply, null)
}
