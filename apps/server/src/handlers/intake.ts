import { IntakeService } from '../services/IntakeService'
import { ok, type Rep, type Req } from './_shared'

const intake = new IntakeService()

export const listSources = async (r: Req, reply: Rep) => ok(reply, await intake.listSources(r.ctx))
export const previewImport = async (r: Req, reply: Rep) => ok(reply, await intake.preview(r.ctx, r.body))
export const listImports = async (r: Req, reply: Rep) => ok(reply, await intake.listImports(r.ctx))
export const runImport = async (r: Req, reply: Rep) => ok(reply, await intake.runImport(r.ctx, r.body), 201)
export const listReviewQueue = async (r: Req, reply: Rep) => ok(reply, await intake.reviewQueue(r.ctx))
export const resolveReviewItem = async (r: Req, reply: Rep) => ok(reply, await intake.resolveReview(r.ctx, r.params.id, r.body))
export const listLeadForms = async (r: Req, reply: Rep) => ok(reply, await intake.listForms(r.ctx))
export const createLeadForm = async (r: Req, reply: Rep) => ok(reply, await intake.createForm(r.ctx, r.body), 201)
export const updateLeadForm = async (r: Req, reply: Rep) => ok(reply, await intake.updateForm(r.ctx, r.params.id, r.body))
export const getPublicForm = async (r: Req, reply: Rep) => ok(reply, await intake.publicForm(r.params.token))
export const submitPublicForm = async (r: Req, reply: Rep) =>
  ok(reply, await intake.submitPublicForm(r.params.token, r.body, r.ip), 202)
