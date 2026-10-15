import { ProfileService } from '../services/ProfileService'
import { ok, type Rep, type Req } from './_shared'

const profiles = new ProfileService()

export const updateMyProfile = async (r: Req, reply: Rep) => ok(reply, await profiles.updateMine(r.ctx, r.body))
export const getProfile = async (r: Req, reply: Rep) => ok(reply, await profiles.get(r.ctx, r.params.slug))
export const listRecognitionTypes = async (r: Req, reply: Rep) => ok(reply, await profiles.recognitionTypes(r.ctx))
export const giveRecognition = async (r: Req, reply: Rep) => ok(reply, await profiles.give(r.ctx, r.body), 201)
