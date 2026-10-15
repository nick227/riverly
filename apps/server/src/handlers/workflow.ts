import { ResourceService, WorkflowService } from '../services/WorkflowService'
import { ok, type Rep, type Req } from './_shared'

const workflow = new WorkflowService()
const resources = new ResourceService()

export const getWorkflow = async (r: Req, reply: Rep) => ok(reply, await workflow.get(r.ctx))
export const publishWorkflow = async (r: Req, reply: Rep) => ok(reply, await workflow.publish(r.ctx, r.body), 201)
export const listResources = async (r: Req, reply: Rep) => ok(reply, await resources.list(r.ctx))
export const createResource = async (r: Req, reply: Rep) => ok(reply, await resources.create(r.ctx, r.body), 201)
export const updateResource = async (r: Req, reply: Rep) => ok(reply, await resources.update(r.ctx, r.params.id, r.body))
