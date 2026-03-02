/**
 * Unit testy pro YAML serializér.
 */

import { describe, it, expect } from 'vitest'
import { toYaml } from './yaml.js'

describe('toYaml', () => {
  it('serializuje primitiva', () => {
    expect(toYaml(null)).toBe('null')
    expect(toYaml(true)).toBe('true')
    expect(toYaml(false)).toBe('false')
    expect(toYaml(42)).toBe('42')
    expect(toYaml('')).toBe("''")
    expect(toYaml('hello')).toBe('hello')
  })

  it('escapuje speciální znaky v řetězcích', () => {
    expect(toYaml('text: s dvojtečkou')).toBe('"text: s dvojtečkou"')
    expect(toYaml('true')).toBe('"true"')
    expect(toYaml('null')).toBe('"null"')
    expect(toYaml('#komentář')).toBe('"#komentář"')
    expect(toYaml('řádek1\nřádek2')).toBe('"řádek1\\nřádek2"')
  })

  it('serializuje prázdné kolekce', () => {
    expect(toYaml([])).toBe('[]')
    expect(toYaml({})).toBe('{}')
  })

  it('serializuje plochý objekt', () => {
    const result = toYaml({ id: 'a1', name: 'Projekt', priority: 'high' })
    expect(result).toBe('id: a1\nname: Projekt\npriority: high')
  })

  it('serializuje objekt s null hodnotou', () => {
    const result = toYaml({ id: 'a1', description: null })
    expect(result).toBe('id: a1\ndescription: null')
  })

  it('serializuje objekt s prázdným polem', () => {
    const result = toYaml({ id: 'a1', tags: [] })
    expect(result).toBe('id: a1\ntags: []')
  })

  it('serializuje pole řetězců', () => {
    const result = toYaml(['alpha', 'beta', 'gamma'])
    expect(result).toBe('- alpha\n- beta\n- gamma')
  })

  it('serializuje pole objektů', () => {
    const result = toYaml([
      { id: 'g1', name: 'Cíl 1' },
      { id: 'g2', name: 'Cíl 2' },
    ])
    expect(result).toBe('- id: g1\n  name: Cíl 1\n- id: g2\n  name: Cíl 2')
  })

  it('serializuje vnořené pole v objektu', () => {
    const result = toYaml({
      projects: [
        { id: 'p1', name: 'E-shop', relatedIds: ['r1', 'r2'] },
      ],
    })
    expect(result).toBe(
      'projects:\n' +
      '  - id: p1\n' +
      '    name: E-shop\n' +
      '    relatedIds:\n' +
      '      - r1\n' +
      '      - r2'
    )
  })

  it('serializuje typickou datovou strukturu aplikace', () => {
    const data = {
      projects: [
        { id: 'p1', name: 'Redesign', scope: 'medium', priority: 'high', phase: 'Design' },
      ],
      goals: [
        { id: 'g1', projectId: 'p1', code: 'GOL-001', name: 'Zvýšit konverzi', description: 'Popsat cíl', metrics: 'KPI > 5%' },
      ],
      stakeholders: [],
    }
    const result = toYaml(data)
    expect(result).toContain('projects:')
    expect(result).toContain('  - id: p1')
    expect(result).toContain('    name: Redesign')
    expect(result).toContain('goals:')
    expect(result).toContain('    code: GOL-001')
    expect(result).toContain('stakeholders: []')
  })
})
