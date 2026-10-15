import Fastify, { type FastifyServerOptions } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fastifyStatic from '@fastify/static'
import openapiGlue from 'fastify-openapi-glue'
import { load } from 'js-yaml'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Prisma } from '@project/db'
import * as handlers from './handlers/index'
import * as security from './plugins/security'
import { config } from './lib/config'
import { HttpError } from './lib/errors'

export const specPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../packages/api-spec/openapi.yaml')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const PREFIX = config.API_PREFIX
const PUBLIC_POST_PREFIXES = [`${PREFIX}/public/`, `${PREFIX}/webhooks/`]

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: config.isTest ? false : { level: config.isProd ? 'info' : 'debug', redact: ['req.headers.authorization', 'req.headers.cookie'] },
    trustProxy: config.trustProxy,
    bodyLimit: 6 * 1024 * 1024, // CSV imports up to ~5 MB arrive as JSON
    ...opts,
  })

  // Keep the raw JSON body for webhook signature verification.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    ;(req as unknown as { rawBody: string }).rawBody = body as string
    if (!body) return done(null, undefined)
    try {
      done(null, JSON.parse(body as string))
    } catch {
      done(new HttpError(400, 'Malformed JSON body', 'bad_json'), undefined)
    }
  })

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })
  // Credentialed CORS only for the configured web app origins. Public form routes are
  // embedded on company websites, so they allow any origin but never send credentials.
  await app.register(cors, () => (req: { url?: string }, cb: (err: Error | null, o: object) => void) => {
    if (req.url?.startsWith(`${PREFIX}/public/`)) return cb(null, { origin: true, credentials: false })
    cb(null, { origin: config.corsOrigins, credentials: true })
  })
  await app.register(cookie)
  await app.register(multipart, { limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1, fields: 0 } })

  // CSRF defence for cookie auth: state-changing requests from a browser must come from an allowed origin.
  app.addHook('onRequest', async (request, reply) => {
    if (SAFE_METHODS.has(request.method)) return
    if (PUBLIC_POST_PREFIXES.some((p) => request.url.startsWith(p))) return
    const origin = request.headers.origin
    if (origin && !config.corsOrigins.includes(origin)) {
      return reply.status(403).send({ error: 'Request origin not allowed', code: 'bad_origin' })
    }
  })

  const spec = load(readFileSync(specPath, 'utf-8')) as Record<string, unknown>
  const multipartRoutes = multipartOperations(spec)

  app.addHook('onRoute', (route) => {
    // Authenticate before validating: anonymous callers get 401, never schema details.
    // (fastify-openapi-glue attaches security as a preHandler, which runs after validation.)
    if (route.preHandler) {
      const existing = route.onRequest ? [route.onRequest].flat() : []
      route.onRequest = [...existing, ...[route.preHandler].flat()] as never
      delete route.preHandler
    }
    // Multipart bodies are parsed by @fastify/multipart inside the handler, which enforces
    // the file field, size and type itself.
    const methods = [route.method].flat()
    if (route.schema?.body && methods.some((m) => multipartRoutes.has(`${m} ${route.url.slice(PREFIX.length)}`))) delete route.schema.body
  })
  if (!config.isProd) {
    await app.register(swagger, { mode: 'static', specification: { document: spec as never } })
    await app.register(swaggerUi, { routePrefix: '/docs' })
  }

  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ error: error.message, code: error.code, details: error.details })
    }
    if (error.validation) {
      return reply.status(400).send({ error: 'Some fields are missing or invalid', code: 'validation', details: error.validation })
    }
    if (error.name === 'Unauthorized' && error.statusCode) {
      const inner = error.errors?.[0]
      const status = inner?.statusCode ?? error.statusCode
      return reply.status(status).send({ error: inner?.message ?? 'Not signed in', code: inner?.code ?? 'unauthorized' })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return reply.status(404).send({ error: 'Not found', code: 'not_found' })
      if (error.code === 'P2002') return reply.status(409).send({ error: 'That already exists', code: 'conflict' })
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message, code: error.code })
    }
    request.log.error(error)
    return reply.status(500).send({ error: 'Something went wrong on our side', code: 'internal' })
  })

  await app.register(openapiGlue, {
    specification: spec,
    serviceHandlers: handlers,
    securityHandlers: security,
    prefix: PREFIX || undefined,
  } as never)

  // Single-origin production: serve the built SPA; unknown non-API GETs fall back to index.html.
  const webDir = config.SERVE_WEB_DIR ? resolve(config.SERVE_WEB_DIR) : null
  if (webDir && existsSync(resolve(webDir, 'index.html'))) {
    await app.register(fastifyStatic, { root: webDir, wildcard: false, index: false, maxAge: '1h' })
    const indexHtml = readFileSync(resolve(webDir, 'index.html'))
    app.setNotFoundHandler((request, reply) => {
      const isApi = PREFIX && request.url.startsWith(`${PREFIX}/`)
      if (request.method === 'GET' && !isApi && !/\.[a-z0-9]+$/i.test(request.url.split('?')[0]!)) {
        return reply.header('Cache-Control', 'no-cache').type('text/html').send(indexHtml)
      }
      return reply.status(404).send({ error: 'Not found', code: 'not_found' })
    })
  }

  return app
}

function multipartOperations(spec: Record<string, unknown>) {
  const out = new Set<string>()
  for (const [path, item] of Object.entries((spec.paths ?? {}) as Record<string, Record<string, any>>)) {
    for (const [method, op] of Object.entries(item)) {
      if (op?.requestBody?.content?.['multipart/form-data']) out.add(`${method.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ':$1')}`)
    }
  }
  return out
}
