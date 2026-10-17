import { IntegrationService } from '../services/IntegrationService'
import { ok, type Rep, type Req } from './_shared'

const service = new IntegrationService()

export const listIntegrations = async (r: Req, reply: Rep) => ok(reply, await service.list(r.ctx))
export const getIntegration = async (r: Req, reply: Rep) => ok(reply, await service.get(r.ctx, r.params.provider))
export const updateIntegration = async (r: Req, reply: Rep) => ok(reply, await service.update(r.ctx, r.params.provider, r.body))
export const testIntegration = async (r: Req, reply: Rep) => ok(reply, await service.test(r.ctx, r.params.provider, r.body))
export const syncIntegration = async (r: Req, reply: Rep) => ok(reply, await service.sync(r.ctx, r.params.provider, r.body))
export const disconnectIntegration = async (r: Req, reply: Rep) => ok(reply, await service.disconnect(r.ctx, r.params.provider))
export const handleZapierWebhook = async (r: Req, reply: Rep) =>
  ok(reply, await service.handleZapierWebhook(r.query.token, r.body), 202)
