import { db } from '@project/db'
import type { FieldDefinition, WorkflowDefinition } from '@project/shared'
import { unprocessable } from '../lib/errors'
import { assertOption } from './jobs'

const TEXT_LIMIT = { text: 300, textarea: 5000 } as const

/**
 * Validates and normalises a workflow field value (non-native fields only). Empty input
 * clears the value (`null`). Throws 422 with the field label on invalid input.
 */
export async function validateFieldValue(orgId: string, def: WorkflowDefinition, field: FieldDefinition, v: unknown): Promise<unknown> {
  const value = normalizeFieldValue(def, field, v)
  if (field.type === 'member' && value !== null) await assertActiveMember(orgId, field, value as string)
  return value
}

/** Shape checks that need no database access. `member` values are only type-checked here. */
export function normalizeFieldValue(def: WorkflowDefinition, field: FieldDefinition, v: unknown): unknown {
  if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null
  const fail = (msg: string): never => {
    throw unprocessable(`${field.label}: ${msg}`)
  }
  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (typeof v !== 'string') return fail('expected text')
      const s = v.trim()
      if (s.length > TEXT_LIMIT[field.type]) fail('too long')
      return s || null
    }
    case 'date':
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) fail('expected a date (YYYY-MM-DD)')
      return v
    case 'datetime':
      if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) return fail('expected a date and time')
      return new Date(v).toISOString()
    case 'select':
      if (typeof v !== 'string') return fail('expected an option')
      assertOption(def, field.id, v)
      return v
    case 'multi_select':
      return normalizeOptionList(def, field, v, fail)
    case 'boolean':
      if (typeof v !== 'boolean') fail('expected yes or no')
      return v
    case 'money':
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) fail('expected an amount in cents')
      return v
    case 'member':
      if (typeof v !== 'string') fail('expected a team member')
      return v
    case 'url':
      return normalizeUrl(v, fail)
    default:
      return fail('not a value field')
  }
}

function normalizeOptionList(def: WorkflowDefinition, field: FieldDefinition, v: unknown, fail: (msg: string) => never) {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) fail('expected a list of options')
  const ids = [...new Set(v as string[])]
  for (const id of ids) assertOption(def, field.id, id)
  return ids
}

function normalizeUrl(v: unknown, fail: (msg: string) => never) {
  if (typeof v !== 'string') return fail('expected a link')
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return fail('expected a full URL')
  }
  if (!['http:', 'https:'].includes(url.protocol)) fail('only http(s) links are allowed')
  return url.toString()
}

async function assertActiveMember(orgId: string, field: FieldDefinition, userId: string) {
  const m = await db.membership.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId } } })
  if (!m || m.status !== 'ACTIVE') throw unprocessable(`${field.label}: not an active team member`)
}
