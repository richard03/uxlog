/**
 * Unit testy pro doporučení dalších aktivit.
 */

import { describe, it, expect } from 'vitest'
import { getActivityRecommendations } from './activityRecommendations.js'

const keys = (recs) => recs.map((r) => r.typeKey)

describe('getActivityRecommendations', () => {
  it('prázdný projekt: rizika, stakeholdeři, konkurence a persony', () => {
    expect(getActivityRecommendations({ activities: [] })).toEqual([
      { typeKey: 'pre_mortem', reasonKey: 'noRisks', count: 0 },
      { typeKey: 'stakeholder_analysis', reasonKey: 'noStakeholders', count: 0 },
      { typeKey: 'competitive_analysis', reasonKey: 'noCompetitors', count: 0 },
      { typeKey: 'personas', reasonKey: 'noPersonas', count: 0 },
    ])
  })

  it('stakeholdeři bez vlivu nebo zájmu', () => {
    const recs = getActivityRecommendations({
      stakeholders: [{ id: 's1', influenceLevel: 'high', interestLevel: '' }, { id: 's2', influenceLevel: 'low', interestLevel: 'low' }],
    })
    expect(recs).toContainEqual({ typeKey: 'stakeholder_analysis', reasonKey: 'stakeholderMatrixIncomplete', count: 1 })
  })

  it('persony bez propojeného scénáře (podle souvislostí)', () => {
    const data = {
      personas: [{ id: 'p1' }, { id: 'p2' }],
      scenarios: [{ id: 's1' }],
      connections: [{ entityType1: 'scenarios', entityId1: 's1', entityType2: 'personas', entityId2: 'p1' }],
    }
    expect(getActivityRecommendations(data)).toContainEqual({ typeKey: 'scenarios', reasonKey: 'personasWithoutScenarios', count: 1 })
    data.connections.push({ entityType1: 'personas', entityId1: 'p2', entityType2: 'scenarios', entityId2: 's1' })
    expect(keys(getActivityRecommendations(data))).not.toContain('scenarios')
  })

  it('persony a žádné scénáře', () => {
    expect(getActivityRecommendations({ personas: [{ id: 'p1' }] })).toContainEqual({ typeKey: 'scenarios', reasonKey: 'noScenarios', count: 1 })
  })

  it('požadavky bez kategorie a bez rozlišené priority', () => {
    const requirements = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, priority: 'could', category: i ? '' : 'data' }))
    const recs = getActivityRecommendations({ requirements })
    expect(recs).toContainEqual({ typeKey: 'requirements', reasonKey: 'requirementsUncategorized', count: 4 })
    expect(recs).toContainEqual({ typeKey: 'prioritization_workshop', reasonKey: 'requirementsNotPrioritized', count: 5 })
    requirements[0].priority = 'must'
    expect(keys(getActivityRecommendations({ requirements }))).not.toContain('prioritization_workshop')
  })

  it('netestované hypotézy (i bez stavu)', () => {
    const recs = getActivityRecommendations({ hypotheses: [{ id: 'h1' }, { id: 'h2', status: 'tested' }, { id: 'h3', status: 'untested' }] })
    expect(recs).toContainEqual({ typeKey: 'usability_testing', reasonKey: 'untestedHypotheses', count: 2 })
  })

  it('nedoporučí typ, který projekt má (i odstraněný), ani nedostupný typ', () => {
    const data = { activities: [{ typeKey: 'stakeholder_analysis', dismissed: true }, { typeKey: null }], risks: [{ id: 'r1' }] }
    expect(keys(getActivityRecommendations(data))).toEqual(['competitive_analysis', 'personas'])
    expect(keys(getActivityRecommendations(data, ['personas']))).toEqual(['personas'])
  })

  it('snese neplatný vstup', () => {
    expect(keys(getActivityRecommendations(null))).toEqual(['pre_mortem', 'stakeholder_analysis', 'competitive_analysis', 'personas'])
    expect(keys(getActivityRecommendations({ personas: 'x', risks: 'x', connections: [null], activities: [null] }))).toHaveLength(4)
  })
})
