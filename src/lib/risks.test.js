/**
 * Unit testy pro entitu Riziko a nová pole artefaktů z metodiky.
 */

import { describe, it, expect } from 'vitest'
import {
  createRisk, createStakeholder, createRequirement, createScenario, createPersona, createCompetition,
} from './models.js'
import { searchAll } from './search.js'
import { getEntityCompleteness } from './completeness.js'
import { analyzeImport, buildImportData } from './importLogic.js'
import { ENTITY_FIELD_DEFAULTS, ENTITIES_WITH_CODE } from './entityFieldDefaults.js'

describe('createRisk', () => {
  it('vytvoří riziko s výchozími hodnotami', () => {
    const r = createRisk('p1')
    expect(r).toMatchObject({ projectId: 'p1', code: '', name: '', likelihood: '', impact: '', mitigation: '', status: 'open', customFields: {} })
    expect(r.id).toBeTruthy()
  })

  it('riziko má kód a konfigurovatelné atributy', () => {
    expect(ENTITIES_WITH_CODE.has('risk')).toBe(true)
    expect(ENTITY_FIELD_DEFAULTS.risk.map((f) => f.key)).toEqual(['description', 'likelihood', 'impact', 'mitigation', 'status'])
  })
})

describe('nová pole artefaktů', () => {
  it('factory funkce obsahují pole z metodiky', () => {
    expect(createStakeholder('p')).toMatchObject({ attitude: '', commFrequency: '', commChannel: '', commNeeds: '' })
    expect(createRequirement('p')).toMatchObject({ category: '' })
    expect(createScenario('p')).toMatchObject({ trigger: '', outcome: '' })
    expect(createPersona('p')).toMatchObject({ quote: '', barriers: '' })
    expect(createCompetition('p')).toMatchObject({ competitorType: '' })
  })

  it('nová textová pole jsou prohledávatelná', () => {
    const data = {
      scenarios: [{ id: 's1', projectId: 'p', name: 'Nákup', trigger: 'Dojde mléko' }],
      personas: [{ id: 'x1', projectId: 'p', name: 'Jana', barriers: 'Nedůvěra k online platbám' }],
    }
    expect(searchAll(data, 'mléko').scenarioIds).toEqual(['s1'])
    expect(searchAll(data, 'nedůvěra').personaIds).toEqual(['x1'])
  })
})

describe('riziko – vyhledávání, úplnost a import', () => {
  const risk = { id: 'r1', projectId: 'p', code: 'RSK-001', name: 'Zpoždění dodávky', description: 'Dodavatel nestihne API', mitigation: 'Mock API' }

  it('vyhledá riziko podle kódu i textu opatření', () => {
    expect(searchAll({ risks: [risk] }, 'RSK-001').riskIds).toEqual(['r1'])
    expect(searchAll({ risks: [risk] }, 'mock').riskIds).toEqual(['r1'])
    expect(searchAll({}, 'x').riskIds).toEqual([])
  })

  it('úplnost počítá popis, pravděpodobnost, dopad a opatření', () => {
    expect(getEntityCompleteness(risk, 'risk')).toEqual({ filled: 3, total: 5 })
  })

  it('import rizika doplní chybějící pole z factory', () => {
    const state = { projects: [{ id: 'p' }], risks: [] }
    const plan = analyzeImport({ risks: [{ code: 'RSK-001', name: 'Zpoždění' }] }, state, 'p')
    expect(plan.risks).toHaveLength(1)
    const data = buildImportData(plan, { project: false, risks: [true] }, 'p', state, false)
    expect(data.upserts.risks[0].prepared).toMatchObject({ projectId: 'p', code: 'RSK-001', status: 'open', mitigation: '' })
  })
})
