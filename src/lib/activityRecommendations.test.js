/**
 * Unit testy pro doporučení dalších aktivit.
 */

import { describe, it, expect } from 'vitest'
import { getActivityRecommendations, ALWAYS_RECOMMENDED } from './activityRecommendations.js'

const keys = (recs) => recs.map((r) => r.typeKey)
const contextual = (recs) => keys(recs.filter((r) => !r.always))
const ALWAYS = ALWAYS_RECOMMENDED.map((r) => r.typeKey)
/** Bez limitu – testy pravidel vidí všechna doporučení. */
const all = (data, available) => getActivityRecommendations(data, available, Infinity)

describe('getActivityRecommendations', () => {
  it('prázdný projekt: rizika, stakeholdeři, konkurence, persony + vždy předání a retrospektiva', () => {
    expect(all({ activities: [] })).toEqual([
      { typeKey: 'pre_mortem', reasonKey: 'noRisks', count: 0, always: false },
      { typeKey: 'stakeholder_analysis', reasonKey: 'noStakeholders', count: 0, always: false },
      { typeKey: 'competitive_analysis', reasonKey: 'noCompetitors', count: 0, always: false },
      { typeKey: 'personas', reasonKey: 'noPersonas', count: 0, always: false },
      { typeKey: 'design_handoff', reasonKey: 'handoffAlways', count: 0, always: true },
      { typeKey: 'retrospective', reasonKey: 'retrospectiveAlways', count: 0, always: true },
    ])
  })

  it('nový projekt s úvodními aktivitami doporučí rizika a persony', () => {
    const activities = ['kickoff', 'goals_metrics', 'stakeholder_analysis', 'competitive_analysis'].map((typeKey) => ({ typeKey }))
    expect(keys(getActivityRecommendations({ activities }))).toEqual(['pre_mortem', 'personas', ...ALWAYS])
  })

  it('limit platí jen pro doporučení podle stavu, předání a retrospektiva jsou vždy navíc', () => {
    const recs = getActivityRecommendations({}, undefined, 2)
    expect(contextual(recs)).toEqual(['pre_mortem', 'stakeholder_analysis'])
    expect(keys(recs).slice(-2)).toEqual(ALWAYS)
    expect(contextual(getActivityRecommendations({}, undefined, 0))).toEqual([])
    expect(keys(getActivityRecommendations({}, undefined, -5))).toEqual(ALWAYS)
  })

  it('předání a retrospektivu nedoporučí, když jsou v seznamu; odstraněné doporučí znovu', () => {
    expect(keys(all({ activities: [{ typeKey: 'design_handoff' }, { typeKey: 'retrospective' }] }))).not.toContain('design_handoff')
    expect(keys(all({ activities: [{ typeKey: 'retrospective' }] }))).not.toContain('retrospective')
    const recs = all({ activities: [{ typeKey: 'retrospective', dismissed: true }] })
    expect(recs).toContainEqual({ typeKey: 'retrospective', reasonKey: 'retrospectiveAlways', count: 0, always: true })
  })

  it('předání a retrospektivu nedoporučí, když je šablona nedostupná', () => {
    expect(keys(all({}, ['retrospective', 'personas']))).toEqual(['personas', 'retrospective'])
  })

  it('stakeholdeři bez vlivu nebo zájmu', () => {
    const recs = all({
      stakeholders: [{ id: 's1', influenceLevel: 'high', interestLevel: '' }, { id: 's2', influenceLevel: 'low', interestLevel: 'low' }],
    })
    expect(recs).toContainEqual({ typeKey: 'stakeholder_analysis', reasonKey: 'stakeholderMatrixIncomplete', count: 1, always: false })
  })

  it('vlivní stakeholdeři → rozhovory se stakeholdery', () => {
    const recs = all({ stakeholders: [{ id: 's1', influenceLevel: 'high' }, { id: 's2', influenceLevel: 'high' }, { id: 's3', influenceLevel: 'low' }] })
    expect(recs).toContainEqual({ typeKey: 'stakeholder_interviews', reasonKey: 'influentialStakeholders', count: 2, always: false })
    expect(keys(all({ stakeholders: [{ id: 's1', influenceLevel: 'low', interestLevel: 'low' }] }))).not.toContain('stakeholder_interviews')
  })

  it('persony → rozhovory s uživateli a scénáře', () => {
    const recs = all({ personas: [{ id: 'p1' }] })
    expect(recs).toContainEqual({ typeKey: 'user_interviews', reasonKey: 'personasNeedValidation', count: 1, always: false })
    expect(recs).toContainEqual({ typeKey: 'scenarios', reasonKey: 'noScenarios', count: 1, always: false })
  })

  it('persony bez propojeného scénáře (podle souvislostí)', () => {
    const data = {
      personas: [{ id: 'p1' }, { id: 'p2' }],
      scenarios: [{ id: 's1' }],
      connections: [{ entityType1: 'scenarios', entityId1: 's1', entityType2: 'personas', entityId2: 'p1' }],
    }
    expect(all(data)).toContainEqual({ typeKey: 'scenarios', reasonKey: 'personasWithoutScenarios', count: 1, always: false })
    data.connections.push({ entityType1: 'personas', entityId1: 'p2', entityType2: 'scenarios', entityId2: 's1' })
    expect(keys(all(data))).not.toContain('scenarios')
  })

  it('scénáře bez požadavků → sběr požadavků; scénáře a požadavky → wireframing', () => {
    expect(all({ scenarios: [{ id: 's1' }] })).toContainEqual({ typeKey: 'requirements', reasonKey: 'noRequirements', count: 1, always: false })
    expect(keys(all({}))).not.toContain('requirements')
    const recs = all({ scenarios: [{ id: 's1' }], requirements: [{ id: 'r1', category: 'data' }] })
    expect(recs).toContainEqual({ typeKey: 'wireframing', reasonKey: 'readyForDesign', count: 1, always: false })
    expect(keys(all({ requirements: [{ id: 'r1', category: 'data' }] }))).not.toContain('wireframing')
  })

  it('požadavky bez kategorie a bez rozlišené priority', () => {
    const requirements = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, priority: 'could', category: i ? '' : 'data' }))
    const recs = all({ requirements })
    expect(recs).toContainEqual({ typeKey: 'requirements', reasonKey: 'requirementsUncategorized', count: 4, always: false })
    expect(recs).toContainEqual({ typeKey: 'prioritization_workshop', reasonKey: 'requirementsNotPrioritized', count: 5, always: false })
    requirements[0].priority = 'must'
    expect(keys(all({ requirements }))).not.toContain('prioritization_workshop')
  })

  it('netestované hypotézy (i bez stavu)', () => {
    const recs = all({ hypotheses: [{ id: 'h1' }, { id: 'h2', status: 'tested' }, { id: 'h3', status: 'untested' }] })
    expect(recs).toContainEqual({ typeKey: 'usability_testing', reasonKey: 'untestedHypotheses', count: 2, always: false })
  })

  it('wireframing v seznamu → usability testing; odstraněný wireframing ne', () => {
    expect(all({ activities: [{ typeKey: 'wireframing' }] })).toContainEqual({ typeKey: 'usability_testing', reasonKey: 'wireframesUntested', count: 0, always: false })
    expect(keys(all({ activities: [{ typeKey: 'wireframing', dismissed: true }] }))).not.toContain('usability_testing')
  })

  it('nedoporučí typ, který projekt má (i odstraněný), ani nedostupný typ', () => {
    const data = { activities: [{ typeKey: 'stakeholder_analysis', dismissed: true }, { typeKey: null }], risks: [{ id: 'r1' }] }
    expect(contextual(all(data))).toEqual(['competitive_analysis', 'personas'])
    expect(keys(all(data, ['personas']))).toEqual(['personas'])
  })

  it('snese neplatný vstup', () => {
    expect(contextual(all(null))).toEqual(['pre_mortem', 'stakeholder_analysis', 'competitive_analysis', 'personas'])
    expect(contextual(all({ personas: 'x', risks: 'x', connections: [null], activities: [null] }))).toHaveLength(4)
    expect(keys(getActivityRecommendations(null, undefined, 'x')).length).toBeGreaterThan(2)
  })
})
