import { describe, it, expect } from 'vitest'
import {
  normalizeHexColor, parseHexColor, relativeLuminance, contrastRatio, readableTextColor, cardColorScheme,
  DARK_TEXT, LIGHT_TEXT,
} from './color.js'

describe('normalizeHexColor / parseHexColor', () => {
  it('sjednotí zápis barvy', () => {
    expect(normalizeHexColor('#FDE68A')).toBe('#fde68a')
    expect(normalizeHexColor(' #abc ')).toBe('#aabbcc')
    expect(parseHexColor('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
  })

  it('neplatné hodnoty vrací null', () => {
    for (const v of [null, undefined, 42, '', 'red', '#12', '#12345', '#ggg', '#11223344']) {
      expect(normalizeHexColor(v)).toBeNull()
      expect(parseHexColor(v)).toBeNull()
    }
  })
})

describe('kontrast', () => {
  it('relativeLuminance a contrastRatio odpovídají WCAG', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBe(1)
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777', '#777')).toBe(1)
    expect(contrastRatio('#fff', 'nesmysl')).toBeNull()
  })

  it('readableTextColor volí tmavé písmo na světlém a bílé na tmavém pozadí', () => {
    expect(readableTextColor('#fde68a')).toBe(DARK_TEXT)
    expect(readableTextColor('#ffffff')).toBe(DARK_TEXT)
    expect(readableTextColor('#1e3a8a')).toBe(LIGHT_TEXT)
    expect(readableTextColor('#000')).toBe(LIGHT_TEXT)
    expect(readableTextColor('')).toBeNull()
  })

  it('zvolené písmo má na celé paletě kartiček kontrast aspoň 4,5 : 1', () => {
    for (const bg of ['#fde68a', '#fdba74', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd', '#67e8f9', '#86efac', '#dc2626', '#2563eb', '#15803d', '#475569']) {
      expect(contrastRatio(bg, readableTextColor(bg))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('cardColorScheme', () => {
  it('odvodí písmo, tlumené písmo a okraj z pozadí', () => {
    expect(cardColorScheme('#FDE68A')).toMatchObject({ background: '#fde68a', text: DARK_TEXT })
    const dark = cardColorScheme('#1e3a8a')
    expect(dark.text).toBe(LIGHT_TEXT)
    expect(dark.muted).toMatch(/^rgba\(255, 255, 255/)
  })

  it('bez platné barvy vrací null', () => {
    expect(cardColorScheme(null)).toBeNull()
    expect(cardColorScheme('modrá')).toBeNull()
  })
})
