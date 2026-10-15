import { describe, expect, it } from 'vitest'
import { ROOFING_TEMPLATE, type FieldDefinition, type WorkflowDefinition } from '@project/shared'
import { normalizeFieldValue } from '../services/fieldValues'

const field = (type: string, extra: Partial<FieldDefinition> = {}) => ({ id: `f_${type}`, label: 'Field', type, ...extra }) as FieldDefinition
const select = field('select', { options: [{ id: 'a', label: 'A' }, { id: 'old', label: 'Old', retired: true }] } as Partial<FieldDefinition>)
const multi = { ...select, id: 'f_multi', type: 'multi_select' } as FieldDefinition
const def = { ...ROOFING_TEMPLATE, fields: [select, multi] } as WorkflowDefinition
const norm = (f: FieldDefinition, v: unknown) => normalizeFieldValue(def, f, v)

describe('normalizeFieldValue', () => {
  it('treats empty input as clearing the value', () => {
    for (const v of [null, '', []]) expect(norm(field('text'), v)).toBeNull()
  })

  it('trims text and enforces length limits', () => {
    expect(norm(field('text'), '  hi  ')).toBe('hi')
    expect(norm(field('text'), '   ')).toBeNull()
    expect(() => norm(field('text'), 'x'.repeat(301))).toThrow('Field: too long')
    expect(norm(field('textarea'), 'x'.repeat(301))).toHaveLength(301)
    expect(() => norm(field('text'), 5)).toThrow('Field: expected text')
  })

  it('validates dates, datetimes, booleans and money', () => {
    expect(norm(field('date'), '2026-10-15')).toBe('2026-10-15')
    expect(() => norm(field('date'), '10/15/2026')).toThrow('expected a date (YYYY-MM-DD)')
    expect(norm(field('datetime'), '2026-10-15T12:00:00Z')).toBe('2026-10-15T12:00:00.000Z')
    expect(() => norm(field('datetime'), 'soon')).toThrow('expected a date and time')
    expect(norm(field('boolean'), false)).toBe(false)
    expect(() => norm(field('money'), 12.5)).toThrow('expected an amount in cents')
    expect(norm(field('money'), 1250)).toBe(1250)
  })

  it('accepts only live options, de-duplicating multi-select lists', () => {
    expect(norm(select, 'a')).toBe('a')
    expect(() => norm(select, 'nope')).toThrow('is not an option')
    expect(() => norm(select, 'old')).toThrow('has been retired')
    expect(norm(multi, ['a', 'a'])).toEqual(['a'])
    expect(() => norm(multi, ['a', 1])).toThrow('expected a list of options')
  })

  it('accepts only absolute http(s) links', () => {
    expect(norm(field('url'), 'https://example.com/x')).toBe('https://example.com/x')
    expect(() => norm(field('url'), 'example.com')).toThrow('Field: expected a full URL')
    expect(() => norm(field('url'), 'ftp://example.com')).toThrow('Field: only http(s) links are allowed')
  })

  it('type-checks member ids (membership is checked against the database separately)', () => {
    expect(norm(field('member'), 'user_1')).toBe('user_1')
    expect(() => norm(field('member'), 1)).toThrow('expected a team member')
  })

  it('rejects types that are not recorded as values', () => {
    expect(() => norm(field('appointment'), 'x')).toThrow('not a value field')
  })
})
