import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { specPath } from '../app'
import * as handlers from '../handlers/index'

// fastify-openapi-glue looks handlers up by operationId at runtime, so static
// analysis (fallow) cannot see these exports being used. This pins the mapping.
describe('handler registry', () => {
  it('exports exactly one handler per OpenAPI operationId', () => {
    const spec = load(readFileSync(specPath, 'utf-8')) as { paths: Record<string, Record<string, { operationId?: string }>> }
    const operationIds = Object.values(spec.paths)
      .flatMap((item) => Object.values(item))
      .map((op) => op.operationId)
      .filter((id): id is string => typeof id === 'string')
      .sort()
    const exported = Object.keys(handlers).sort()
    expect(exported).toEqual(operationIds)
    for (const id of operationIds) expect(typeof (handlers as Record<string, unknown>)[id]).toBe('function')
  })
})
