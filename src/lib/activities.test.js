/**
 * Unit testy pro aktivity.
 */

import { describe, it, expect } from 'vitest'
import { createActivity } from './models.js'
import { searchAll } from './search.js'
import { ACTIVITY_TYPES, getActivityType } from './activityTypes.js'

describe('createActivity', () => {
  it('vytvoří aktivitu s výchozími hodnotami', () => {
    const a = createActivity('proj1')
    expect(a.projectId).toBe('proj1')
    expect(a.status).toBe('pending')
    expect(a.dismissed).toBe(false)
    expect(a.sortOrder).toBe(9999)
    expect(a.typeKey).toBeNull()
    expect(a.id).toBeTruthy()
  })

  it('aplikuje overrides', () => {
    const a = createActivity('proj1', { name: 'Kick-off', typeKey: 'kickoff', sortOrder: 10 })
    expect(a.name).toBe('Kick-off')
    expect(a.typeKey).toBe('kickoff')
    expect(a.sortOrder).toBe(10)
  })
})

describe('ACTIVITY_TYPES', () => {
  it('obsahuje 16 předdefinovaných typů', () => {
    expect(ACTIVITY_TYPES).toHaveLength(16)
  })

  it('každý typ má unikátní klíč', () => {
    const keys = ACTIVITY_TYPES.map((t) => t.key)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })

  it('getActivityType vrátí správný typ', () => {
    const type = getActivityType('kickoff')
    expect(type).toBeDefined()
    expect(type.defaultName).toBe('Kick-off meeting')
  })

  it('getActivityType vrátí undefined pro neznámý klíč', () => {
    expect(getActivityType('neexistuje')).toBeUndefined()
  })
})

describe('searchAll s aktivitami', () => {
  const data = {
    projects: [],
    goals: [],
    stakeholders: [],
    competitions: [],
    hypotheses: [],
    personas: [],
    scenarios: [],
    requirements: [],
    activities: [
      { id: 'a1', projectId: 'p1', name: 'Kick-off meeting', description: 'Úvodní setkání', dismissed: false },
      { id: 'a2', projectId: 'p1', name: 'Wireframing', description: 'Tvorba drátěných modelů', dismissed: false },
      { id: 'a3', projectId: 'p2', name: 'Testování', description: 'Usability test', dismissed: false },
    ],
  }

  it('najde aktivitu podle názvu', () => {
    const r = searchAll(data, 'Kick-off')
    expect(r.activityIds).toContain('a1')
    expect(r.activityIds).not.toContain('a2')
  })

  it('najde aktivitu podle popisu', () => {
    const r = searchAll(data, 'drátěných')
    expect(r.activityIds).toContain('a2')
  })

  it('filtruje aktivity podle projectId', () => {
    const r = searchAll(data, '', 'p2')
    expect(r.activityIds).toContain('a3')
    expect(r.activityIds).not.toContain('a1')
  })

  it('vrátí activityIds jako prázdné pole pokud data neobsahují aktivity', () => {
    const dataWithout = { projects: [], goals: [], stakeholders: [], competitions: [], hypotheses: [], personas: [], scenarios: [], requirements: [] }
    const r = searchAll(dataWithout, 'test')
    expect(r.activityIds).toEqual([])
  })
})
