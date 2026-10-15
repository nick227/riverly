import { describe, expect, it } from 'vitest'
import { ROOFING_TEMPLATE, renderTemplate, validateDefinition, workflowDefinitionSchema, normalizePhone, can } from './index'

const clone = () => structuredClone(ROOFING_TEMPLATE)

describe('roofing template', () => {
  it('parses and validates cleanly', () => {
    const parsed = workflowDefinitionSchema.parse(ROOFING_TEMPLATE)
    expect(validateDefinition(parsed)).toEqual([])
  })

  it('allows relabeling a stage and an option without changing IDs', () => {
    const next = clone()
    next.stages[2]!.label = 'Site visit'
    next.fields.find((f) => f.id === 'urgency')!.options![0]!.label = 'Emergency'
    expect(validateDefinition(next, ROOFING_TEMPLATE)).toEqual([])
  })

  it('rejects deleting a stage or option instead of retiring it', () => {
    const next = clone()
    next.stages = next.stages.filter((s) => s.id !== 'called')
    next.fields.find((f) => f.id === 'urgency')!.options!.pop()
    const paths = validateDefinition(next, ROOFING_TEMPLATE).map((i) => i.path)
    expect(paths).toContain('stages')
    expect(paths).toContain('fields.urgency.options')
  })

  it('rejects changing a field type or binding to a non-whitelisted column', () => {
    const next = clone()
    next.fields.find((f) => f.id === 'interest')!.type = 'text'
    next.fields.find((f) => f.id === 'sales_notes')!.binding = 'contact.passwordHash'
    const messages = validateDefinition(next, ROOFING_TEMPLATE).map((i) => i.message)
    expect(messages.some((m) => m.includes('cannot change'))).toBe(true)
    expect(messages.some((m) => m.includes('not allowed'))).toBe(true)
  })

  it('limits each stage to four highlighted controls', () => {
    const next = clone()
    next.stages[0]!.fieldIds.push('title')
    expect(workflowDefinitionSchema.safeParse(next).success).toBe(false)
  })
})

describe('renderTemplate', () => {
  it('reports unresolved tokens instead of inventing values', () => {
    const r = renderTemplate('Hi {{contact.firstName}}, see {{review.url}}', { 'contact.firstName': 'Don' })
    expect(r.text).toBe('Hi Don, see {{review.url}}')
    expect(r.unresolved).toEqual(['review.url'])
  })
})

describe('helpers', () => {
  it('normalizes US phone numbers', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('5551234567')
  })
  it('ranks roles', () => {
    expect(can('MANAGER', 'settings.manage')).toBe(false)
    expect(can('ADMIN', 'settings.manage')).toBe(true)
    expect(can('MEMBER', 'jobs.assign_any')).toBe(false)
  })
})
