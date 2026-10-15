import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthContext } from '../lib/context'
import { config } from '../lib/config'

export type Req = FastifyRequest & { ctx: AuthContext; body: any; query: any; params: any }
export type Rep = FastifyReply

export const SESSION_COOKIE = 'token'

export const cookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  // Production web and API may live on different sites (cross-site XHR needs SameSite=None + Secure).
  sameSite: (config.isProd ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
}

export const ok = (reply: Rep, data: unknown, status = 200) => reply.status(status).send({ data })
