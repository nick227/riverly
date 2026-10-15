import SwaggerParser from '@apidevtools/swagger-parser'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { db, type OrgRole } from '@project/db'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect } from 'vitest'
import { buildApp, specPath } from '../../app'
import { AuthService } from '../../services/AuthService'
import { provisionOrganization } from '../../services/provisioning'

export type World = Awaited<ReturnType<typeof createWorld>>

let derefSpec: any
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

/** Builds the real app (real security handler, real database) for a test file. */
export function useApp() {
  const ctx = {} as { app: FastifyInstance; world: World }
  beforeAll(async () => {
    await resetDb()
    ctx.app = await buildApp()
    await ctx.app.ready()
    ctx.world = await createWorld()
  })
  afterAll(async () => {
    await ctx.app?.close()
  })
  return ctx
}

export async function resetDb() {
  const tables = await db.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0')
  for (const { t } of tables) await db.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``)
  await db.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1')
}

let seq = 0
async function user(name: string) {
  seq++
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${seq}`
  return db.user.create({ data: { email: `${slug}@test.local`, passwordHash: 'x', displayName: name, slug } })
}

async function company(name: string, members: [string, OrgRole][]) {
  const org = await db.organization.create({ data: { name, slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${++seq}`, reviewUrl: 'https://g.page/r/test-review' } })
  const auth = new AuthService()
  const out: Record<string, { id: string; token: string; headers: { authorization: string } }> = {}
  for (const [displayName, role] of members) {
    const u = await user(displayName)
    await db.membership.create({ data: { organizationId: org.id, userId: u.id, role } })
    const token = await auth.createSession(u.id, org.id)
    out[role.toLowerCase()] = { id: u.id, token, headers: { authorization: `Bearer ${token}` } }
  }
  await db.$transaction((tx) => provisionOrganization(tx, org.id, Object.values(out)[0]!.id))
  return { org, ...out } as { org: typeof org } & Record<'owner' | 'admin' | 'manager' | 'member', { id: string; token: string; headers: { authorization: string } }>
}

/** Company A (all four roles) and Company B (an owner) for isolation tests. */
export async function createWorld() {
  const a = await company('Acme Roofing', [
    ['Olivia Owner', 'OWNER'],
    ['Adam Admin', 'ADMIN'],
    ['Mia Manager', 'MANAGER'],
    ['Sam Sales', 'MEMBER'],
  ])
  const b = await company('Other Roofing', [['Bea Boss', 'OWNER']])
  return { a, b }
}

export async function validateResponse(operationId: string, status: number, body: unknown) {
  derefSpec ??= await SwaggerParser.dereference(specPath)
  for (const pathItem of Object.values<any>(derefSpec.paths ?? {})) {
    for (const op of Object.values<any>(pathItem)) {
      if (op?.operationId !== operationId) continue
      const schema = op.responses?.[status]?.content?.['application/json']?.schema
      if (!schema) return
      const validate = ajv.compile(schema)
      if (!validate(body)) throw new Error(`${operationId} ${status} response does not match spec:\n${JSON.stringify(validate.errors, null, 2)}`)
      return
    }
  }
  throw new Error(`Unknown operationId ${operationId}`)
}

/** inject + status assertion + spec validation in one call. */
export async function call(
  app: FastifyInstance,
  operationId: string,
  opts: { method: string; url: string; headers?: Record<string, string>; payload?: unknown },
  expectStatus: number,
) {
  const res = await app.inject({ method: opts.method as any, url: opts.url, headers: opts.headers, payload: opts.payload as any })
  if (res.statusCode !== expectStatus) throw new Error(`${opts.method} ${opts.url} → ${res.statusCode} (expected ${expectStatus}): ${res.body}`)
  const body = res.body ? res.json() : null
  await validateResponse(operationId, expectStatus, body)
  return body
}

export const key = () => `k_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

export async function makeJob(app: FastifyInstance, headers: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const body = await call(
    app,
    'createContact',
    {
      method: 'POST',
      url: '/contacts',
      headers,
      payload: {
        name: 'Don Lou',
        email: `don${Math.random().toString(36).slice(2, 7)}@example.com`,
        phone: '(555) 123-4567',
        job: { title: 'Roof replacement', propertyAddress: '123 Maple Ave', leadSourceOptionId: 'google_ad' },
        ...overrides,
      },
    },
    201,
  )
  expect(body.data.opportunities).toHaveLength(1)
  return { contact: body.data, job: body.data.opportunities[0] }
}
