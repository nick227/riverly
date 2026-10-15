import { AuthService } from '../services/AuthService'
import { cookieOptions, ok, SESSION_COOKIE, type Rep, type Req } from './_shared'

const auth = new AuthService()

export async function login(request: Req, reply: Rep) {
  const { token, me } = await auth.login(request.body, request.ip)
  reply.setCookie(SESSION_COOKIE, token, cookieOptions)
  return ok(reply, me)
}

export async function logout(request: Req, reply: Rep) {
  const token = request.cookies?.[SESSION_COOKIE] ?? request.headers.authorization?.replace(/^Bearer /, '')
  await auth.logout(token)
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
  return ok(reply, null)
}

export async function getCurrentUser(request: Req, reply: Rep) {
  return ok(reply, await auth.me(request.ctx.userId, request.ctx.orgId))
}

export async function switchOrganization(request: Req, reply: Rep) {
  return ok(reply, await auth.switchOrganization(request.ctx, request.body.organizationId))
}

export async function createCompany(request: Req, reply: Rep) {
  const { token, me } = await auth.createCompany(request.body, request.ip)
  reply.setCookie(SESSION_COOKIE, token, cookieOptions)
  return ok(reply, me, 201)
}

export async function getInvitation(request: Req, reply: Rep) {
  return ok(reply, await auth.previewInvitation(request.params.token))
}

export async function acceptInvitation(request: Req, reply: Rep) {
  const { token, me } = await auth.acceptInvitation(request.params.token, request.body, request.ip)
  reply.setCookie(SESSION_COOKIE, token, cookieOptions)
  return ok(reply, me)
}
