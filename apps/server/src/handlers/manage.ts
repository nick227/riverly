import { ManageService } from '../services/ManageService'
import { ok, type Rep, type Req } from './_shared'

const manage = new ManageService()

export const getManageOverview = async (r: Req, reply: Rep) => ok(reply, await manage.overview(r.ctx, r.query.staleDays))
export const getPipelineReport = async (r: Req, reply: Rep) => ok(reply, await manage.pipeline(r.ctx, r.query))
export const getActivityReport = async (r: Req, reply: Rep) => ok(reply, await manage.activity(r.ctx, r.query))
export const listWorkerRuns = async (r: Req, reply: Rep) => ok(reply, await manage.workerRuns(r.ctx))
