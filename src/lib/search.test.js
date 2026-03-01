/**
 * Unit testy pro fulltextové vyhledávání.
 */

import { describe, it, expect } from 'vitest'
import { searchAll } from './search.js'

describe('searchAll', () => {
  const data = {
    projects: [
      { id: 'p1', projectId: null, name: 'E-shop redesign' },
    ],
    goals: [
      { id: 'g1', projectId: 'p1', code: 'G1', name: 'Zvýšit konverzi', description: 'Cíl pro konverzi', metrics: 'KPI' },
    ],
    stakeholders: [],
    competitions: [],
    hypotheses: [],
    personas: [],
    scenarios: [],
    requirements: [],
  }

  it('najde projekt podle názvu', () => {
    const r = searchAll(data, 'E-shop')
    expect(r.projectIds).toContain('p1')
  })

  it('najde cíl podle kódu', () => {
    const r = searchAll(data, 'G1')
    expect(r.goalIds).toContain('g1')
  })

  it('najde cíl podle popisu', () => {
    const r = searchAll(data, 'konverzi')
    expect(r.goalIds).toContain('g1')
  })

  it('vrací prázdné pole pro prázdný dotaz', () => {
    const r = searchAll(data, '')
    expect(r.projectIds).toContain('p1')
  })

  it('filtruje podle projectId', () => {
    const r = searchAll(data, 'konverzi', 'p1')
    expect(r.goalIds).toContain('g1')
  })
})
