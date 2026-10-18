/**
 * Unit testy pro katalog typů aktivit a jejich metodiku.
 */

import { describe, it, expect } from 'vitest'
import { ACTIVITY_TYPES, ACTIVITY_GROUPS, getActivityGuide } from './activityTypes.js'

/** Klíče a id položek checklistu, které existovaly před rozšířením katalogu – musí zůstat kvůli uloženým aktivitám. */
const LEGACY = {
  kickoff: ['scope', 'collaboration', 'timeline', 'stakeholders', 'roles'],
  goals_metrics: ['smart', 'kpi', 'baseline', 'stakeholder_approval'],
  stakeholder_analysis: ['identified', 'matrix', 'needs', 'comm_plan'],
  user_interviews: ['guide', 'conducted', 'analyzed', 'patterns', 'shared'],
  competitive_analysis: ['identified', 'strengths', 'inspiration', 'advantage'],
  personas: ['proto_personas', 'goals_needs', 'recruitment', 'updated'],
  scenarios: ['main_scenarios', 'secondary_scenarios', 'error_scenarios', 'quantitative', 'stakeholders_review'],
  requirements: ['business', 'legal', 'security', 'technical', 'nonfunctional', 'motivation', 'priority', 'conflicts', 'approved'],
  information_architecture: ['data_model', 'card_sorting', 'navigation', 'tested'],
  wireframing: ['main_flows', 'secondary_flows', 'error_flows', 'variants', 'iterated', 'approved'],
  usability_testing: ['hypotheses', 'tasks', 'prototype', 'recruitment_criteria', 'stakeholder_approval', 'recruited', 'conducted', 'insights', 'issues', 'iterated', 'shared'],
  design_handoff: ['specs', 'assets', 'interactions', 'review'],
  retrospective: ['positives', 'improvements', 'actions', 'documented'],
}

describe('ACTIVITY_TYPES – struktura', () => {
  it('každý typ má platnou skupinu, název, popis, pořadí a délku', () => {
    for (const t of ACTIVITY_TYPES) {
      expect(ACTIVITY_GROUPS).toContain(t.group)
      expect(t.defaultName).toBeTruthy()
      expect(t.defaultDescription).toBeTruthy()
      expect(Number.isFinite(t.sortOrder)).toBe(true)
      expect(t.defaultDurationDays).toBeGreaterThan(0)
      expect(typeof t.createOnNewProject).toBe('boolean')
    }
  })

  it('id položek checklistu jsou v rámci typu unikátní', () => {
    for (const t of ACTIVITY_TYPES) {
      const ids = t.checklist.map((c) => c.id)
      expect(new Set(ids).size, t.key).toBe(ids.length)
      expect(t.checklist.every((c) => c.label)).toBe(true)
    }
  })

  it('pořadí (sortOrder) je unikátní', () => {
    const orders = ACTIVITY_TYPES.map((t) => t.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('zachovává původní typy a id položek checklistu', () => {
    for (const [key, ids] of Object.entries(LEGACY)) {
      const type = ACTIVITY_TYPES.find((t) => t.key === key)
      expect(type, key).toBeDefined()
      const current = type.checklist.map((c) => c.id)
      for (const id of ids) expect(current, `${key}.${id}`).toContain(id)
    }
  })

  it('u nového projektu se zakládají jen původní typy', () => {
    const auto = ACTIVITY_TYPES.filter((t) => t.createOnNewProject).map((t) => t.key).sort()
    expect(auto).toEqual(Object.keys(LEGACY).sort())
  })

  it('metodika neobsahuje odkazy ani zmínky osob (@)', () => {
    for (const t of ACTIVITY_TYPES) {
      const text = JSON.stringify(t.guide)
      expect(text, t.key).not.toMatch(/https?:|@|miro|notion/i)
    }
  })
})

describe('getActivityGuide', () => {
  it('každý typ má metodiku s postupem a výstupy', () => {
    for (const t of ACTIVITY_TYPES) {
      const g = getActivityGuide(t.key)
      expect(g.why, t.key).toBeTruthy()
      expect(g.when, t.key).toBeTruthy()
      expect(g.steps.length, t.key).toBeGreaterThan(0)
      expect(g.outputs.length, t.key).toBeGreaterThan(0)
    }
  })

  it('pro neznámý klíč vrátí null', () => {
    expect(getActivityGuide('neexistuje')).toBeNull()
    expect(getActivityGuide(undefined)).toBeNull()
  })
})
