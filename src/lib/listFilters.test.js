/**
 * Unit testy pro listFilters.
 */

import { describe, it, expect } from 'vitest'
import { filterByAnyActiveBranch } from './listFilters.js'

describe('filterByAnyActiveBranch', () => {
  const items = [
    { id: 'a', v: 1 },
    { id: 'b', v: 2 },
    { id: 'c', v: 3 },
  ]

  it('bez aktivní větve vrátí původní seznam (stejná reference)', () => {
    expect(filterByAnyActiveBranch(items, [{ active: false, match: () => true }])).toBe(items)
  })

  it('prázdný vstup snese null/undefined', () => {
    expect(filterByAnyActiveBranch(null, [])).toEqual([])
    expect(filterByAnyActiveBranch(undefined, [])).toEqual([])
  })

  it('jedna aktivní větev filtruje', () => {
    const out = filterByAnyActiveBranch(items, [{ active: true, match: (x) => x.v === 2 }])
    expect(out).toEqual([{ id: 'b', v: 2 }])
  })

  it('více aktivních větví spojuje OR', () => {
    const out = filterByAnyActiveBranch(items, [
      { active: true, match: (x) => x.v === 1 },
      { active: true, match: (x) => x.v === 3 },
    ])
    expect(out.map((x) => x.id)).toEqual(['a', 'c'])
  })
})
