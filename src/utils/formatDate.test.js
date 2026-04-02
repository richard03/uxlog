/**
 * Testy formátování datumů pro zobrazení (závislé na cs-CZ v Intl).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCalendarDate, formatDate, formatStatusBarDateTime } from './formatDate.js'

describe('formatCalendarDate', () => {
  it('vrátí prázdný řetězec pro prázdný vstup', () => {
    expect(formatCalendarDate('')).toBe('')
    expect(formatCalendarDate(null)).toBe('')
    expect(formatCalendarDate(undefined)).toBe('')
  })

  it('formátuje platné YYYY-MM-DD v češtině (krátký měsíc)', () => {
    expect(formatCalendarDate('2026-04-02')).toBe('2. 4. 2026')
  })

  it('respektuje dlouhý název měsíce', () => {
    expect(formatCalendarDate('2026-04-02', { month: 'long' })).toBe('2. dubna 2026')
  })

  it('u neplatného kalendáře vrátí původní řetězec', () => {
    expect(formatCalendarDate('2026-02-30')).toBe('2026-02-30')
  })
})

describe('formatDate', () => {
  it('pro čisté YYYY-MM-DD chová se jako formatCalendarDate', () => {
    expect(formatDate('2026-04-02')).toBe('2. 4. 2026')
  })

  it('pro ISO s časem vrátí lokální datum', () => {
    const s = formatDate('2026-04-02T12:00:00.000Z')
    expect(s).toMatch(/2026/)
    expect(s.length).toBeGreaterThan(0)
  })

  it('vrátí prázdný řetězec pro neplatné datum', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('formatStatusBarDateTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('vrátí null pro prázdný vstup', () => {
    expect(formatStatusBarDateTime('')).toBe(null)
    expect(formatStatusBarDateTime(null)).toBe(null)
  })

  it('v den „dnes“ zobrazí jen čas (24h)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 2, 15, 0, 0))
    const out = formatStatusBarDateTime(new Date(2026, 3, 2, 10, 5, 7).toISOString())
    expect(out).toMatch(/10:05:07/)
  })

  it('jiný den zobrazí datum a čas', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 2, 15, 0, 0))
    const out = formatStatusBarDateTime(new Date(2026, 2, 1, 8, 0, 0).toISOString())
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/08:00:00/)
  })
})
