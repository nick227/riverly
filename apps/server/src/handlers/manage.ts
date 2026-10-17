import { BoardService } from '../services/BoardService'
import { HomeService } from '../services/HomeService'
import { ManageService } from '../services/ManageService'
import { ok, type Rep, type Req } from './_shared'

const manage = new ManageService()
const board = new BoardService()
const home = new HomeService()

export const getManageOverview = async (r: Req, reply: Rep) => ok(reply, await manage.overview(r.ctx, r.query.staleDays))
export const getPipelineReport = async (r: Req, reply: Rep) => ok(reply, await manage.pipeline(r.ctx, r.query))
export const getActivityReport = async (r: Req, reply: Rep) => ok(reply, await manage.activity(r.ctx, r.query))
export const listWorkerRuns = async (r: Req, reply: Rep) => ok(reply, await manage.workerRuns(r.ctx))
export const getSalesBoard = async (r: Req, reply: Rep) => ok(reply, await board.board(r.ctx, r.query.period))
export const getCompanyHome = async (r: Req, reply: Rep) => ok(reply, await home.home(r.ctx))
