import { ActivityService } from '../services/ActivityService'
import { ok, type Rep, type Req } from './_shared'

const activity = new ActivityService()

export const listActivity = async (r: Req, reply: Rep) => reply.send(await activity.list(r.ctx, r.query))
export const logActivity = async (r: Req, reply: Rep) => ok(reply, await activity.log(r.ctx, r.params.id, r.body), 201)
export const correctActivity = async (r: Req, reply: Rep) => ok(reply, await activity.correct(r.ctx, r.params.id, r.body), 201)
export const listComments = async (r: Req, reply: Rep) => ok(reply, await activity.listComments(r.ctx, r.params.id))
export const createComment = async (r: Req, reply: Rep) => ok(reply, await activity.createComment(r.ctx, r.params.id, r.body.body), 201)
export const toggleReaction = async (r: Req, reply: Rep) => ok(reply, await activity.toggleReaction(r.ctx, r.params.id, r.body.code))
export const createPost = async (r: Req, reply: Rep) => ok(reply, await activity.createPost(r.ctx, r.body), 201)
export async function deletePost(r: Req, reply: Rep) {
  await activity.deletePost(r.ctx, r.params.id)
  return ok(reply, null)
}
