import { describe, expect, it } from 'vitest'
import { boardWindow, startOfLocalDay } from '../lib/periods'

const iso = (d: Date) => d.toISOString()

describe('board periods', () => {
  it('starts today at local midnight and compares with the same elapsed time yesterday', () => {
    const w = boardWindow('today', new Date('2026-10-15T15:00:00Z'), 'America/Chicago') // 10:00 CDT
    expect(iso(w.from)).toBe('2026-10-15T05:00:00.000Z')
    expect(iso(w.previous.from)).toBe('2026-10-14T05:00:00.000Z')
    expect(iso(w.previous.to)).toBe('2026-10-14T15:00:00.000Z')
  })

  it('starts the week on Monday', () => {
    const w = boardWindow('week', new Date('2026-10-15T15:00:00Z'), 'America/Chicago') // Thursday
    expect(iso(w.from)).toBe('2026-10-12T05:00:00.000Z')
    expect(iso(w.previous.from)).toBe('2026-10-05T05:00:00.000Z')
  })

  it('handles the day after daylight saving ends', () => {
    // DST ended Sunday 2026-11-01; Monday midnight is CST (UTC-6), Sunday midnight was CDT (UTC-5).
    const w = boardWindow('today', new Date('2026-11-02T15:00:00Z'), 'America/Chicago')
    expect(iso(w.from)).toBe('2026-11-02T06:00:00.000Z')
    expect(iso(w.previous.from)).toBe('2026-11-01T05:00:00.000Z')
    expect(iso(startOfLocalDay(new Date('2026-11-01T12:00:00Z'), 'America/Chicago'))).toBe('2026-11-01T05:00:00.000Z')
  })

  it('uses the company timezone, not UTC, for the day boundary', () => {
    // 02:00 UTC on the 16th is still the evening of the 15th in Denver.
    expect(iso(startOfLocalDay(new Date('2026-10-16T02:00:00Z'), 'America/Denver'))).toBe('2026-10-15T06:00:00.000Z')
  })
})
