/**
 * Unit testy pro generování unikátních kódů.
 */

import { describe, it, expect } from 'vitest'
import { generateNextCode } from './code.js'

describe('generateNextCode', () => {
  it('vrátí PREFIX-001 pro prázdný seznam', () => {
    expect(generateNextCode('SCN', [])).toBe('SCN-001')
    expect(generateNextCode('REQ', [])).toBe('REQ-001')
    expect(generateNextCode('PER', [])).toBe('PER-001')
    expect(generateNextCode('HYP', [])).toBe('HYP-001')
    expect(generateNextCode('GOL', [])).toBe('GOL-001')
  })

  it('vrátí další číslo podle existujících kódů', () => {
    const items = [{ code: 'SCN-001' }, { code: 'SCN-002' }, { code: 'SCN-003' }]
    expect(generateNextCode('SCN', items)).toBe('SCN-004')
  })

  it('ignoruje položky bez kódu nebo s jinou předponou', () => {
    const items = [
      { code: 'SCN-005' },
      { code: '' },
      { code: 'REQ-010' },
      { code: 'scn-003' },
    ]
    expect(generateNextCode('SCN', items)).toBe('SCN-006')
  })

  it('najde maximum i při nesouvislém číslování', () => {
    const items = [{ code: 'REQ-001' }, { code: 'REQ-015' }, { code: 'REQ-003' }]
    expect(generateNextCode('REQ', items)).toBe('REQ-016')
  })

  it('zvládne předponu v různých velikostech písmen', () => {
    expect(generateNextCode('hyp', [{ code: 'HYP-002' }])).toBe('HYP-003')
    expect(generateNextCode('Hyp', [{ code: 'hyp-001' }])).toBe('HYP-002')
  })
})
