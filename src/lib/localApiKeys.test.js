import { describe, it, expect } from 'vitest'
import {
  parseLocalApiKeys, serializeLocalApiKeys, buildApiToken, tokenDisplayPrefix,
  normalizeKeyName, addLocalApiKey, removeLocalApiKey, TOKEN_BYTES, MAX_NAME_LENGTH,
} from './localApiKeys.js'

const HASH = 'a'.repeat(64)
const key = (id, extra = {}) => ({ id, name: `Klíč ${id}`, hash: HASH, prefix: 'uxlog_abcdef', createdAt: '2026-11-07T10:00:00.000Z', ...extra })

describe('parseLocalApiKeys', () => {
  it('reads valid keys from JSON string', () => {
    expect(parseLocalApiKeys(JSON.stringify({ keys: [key('k1')] }))).toEqual([key('k1')])
  })

  it('tolerates corrupt and missing data', () => {
    expect(parseLocalApiKeys('{nope')).toEqual([])
    expect(parseLocalApiKeys(null)).toEqual([])
    expect(parseLocalApiKeys({ keys: 'x' })).toEqual([])
    expect(parseLocalApiKeys([key('k1')])).toEqual([])
  })

  it('drops entries without id or valid hash and duplicates', () => {
    const out = parseLocalApiKeys({ keys: [
      key('k1'), key('k1', { name: 'dup' }), { hash: HASH }, key('k2', { hash: 'short' }),
      key('k3', { hash: 'A'.repeat(64) }), null, key('k4', { name: 5, prefix: null, createdAt: 1 }),
    ] })
    expect(out.map((k) => k.id)).toEqual(['k1', 'k4'])
    expect(out[0].name).toBe('Klíč k1')
    expect(out[1]).toMatchObject({ name: '', prefix: '', createdAt: '' })
  })

  it('does not keep unknown fields (e.g. a plaintext token)', () => {
    expect(parseLocalApiKeys({ keys: [key('k1', { token: 'secret' })] })[0]).not.toHaveProperty('token')
  })
})

describe('serializeLocalApiKeys', () => {
  it('round-trips', () => {
    const text = serializeLocalApiKeys([key('k1'), key('k2')])
    expect(parseLocalApiKeys(text)).toEqual([key('k1'), key('k2')])
  })
})

describe('buildApiToken', () => {
  it('builds prefixed hex token of 64 chars', () => {
    const token = buildApiToken(Array.from({ length: TOKEN_BYTES }, (_, i) => i))
    expect(token).toMatch(/^uxlog_[0-9a-f]{64}$/)
    expect(token.slice(6, 12)).toBe('000102')
  })

  it('refuses too few bytes', () => {
    expect(() => buildApiToken([1, 2, 3])).toThrow()
    expect(() => buildApiToken(null)).toThrow()
  })
})

describe('tokenDisplayPrefix', () => {
  it('keeps prefix and six chars', () => {
    expect(tokenDisplayPrefix('uxlog_0123456789')).toBe('uxlog_012345')
    expect(tokenDisplayPrefix('abcdefghij')).toBe('abcdef')
    expect(tokenDisplayPrefix(undefined)).toBe('')
  })
})

describe('normalizeKeyName', () => {
  it('trims, collapses spaces, falls back and limits length', () => {
    expect(normalizeKeyName('  Figma   notebook ', 'X')).toBe('Figma notebook')
    expect(normalizeKeyName('   ', 'Výchozí')).toBe('Výchozí')
    expect(normalizeKeyName(null, 'Výchozí')).toBe('Výchozí')
    expect(normalizeKeyName('a'.repeat(200), 'X')).toHaveLength(MAX_NAME_LENGTH)
  })
})

describe('addLocalApiKey / removeLocalApiKey', () => {
  it('adds and removes by id', () => {
    const added = addLocalApiKey([key('k1')], key('k2'))
    expect(added.map((k) => k.id)).toEqual(['k1', 'k2'])
    expect(removeLocalApiKey(added, 'k1').map((k) => k.id)).toEqual(['k2'])
    expect(removeLocalApiKey(added, 'missing')).toHaveLength(2)
  })

  it('tolerates non-array input', () => {
    expect(addLocalApiKey(null, key('k1'))).toHaveLength(1)
    expect(removeLocalApiKey(undefined, 'k1')).toEqual([])
  })
})
