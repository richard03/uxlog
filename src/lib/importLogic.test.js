/**
 * Test importní logiky s YAML vstupem uživatele.
 */

import { describe, it, expect } from 'vitest'
import { parseYaml } from './yaml.js'
import { analyzeImport, buildImportData } from './importLogic.js'

describe('import persona flow', () => {
  const yaml = [
    'projects: []',
    'personas:',
    '  - id: 82eb8457-4003-4f64-b0c2-c322fdae722e',
    '    projectId: eccd3ac6-a99c-48b6-b617-5b04a860c7d0',
    '    code: PER-001',
    '    name: designer Richard',
    '    status: protopersona',
    '    description: "UX designér, pracuje v bance pod NDA"',
    '    needs: \'\'',
    '    problems: \'\'',
    '    targetGroupSize: \'\'',
    '    targetGroupValue: \'\'',
    '    scenarioIds: []',
    '    requirementIds: []',
  ].join('\n')

  const currentState = {
    projects: [{ id: 'proj-1', name: 'Test Project', scope: 'medium', priority: 'medium', phase: 'research', lastWorkedAt: '2026-01-01' }],
    goals: [],
    stakeholders: [],
    competitions: [],
    hypotheses: [],
    personas: [],
    scenarios: [],
    requirements: [],
    activities: [],
    teamMembers: [],
  }

  it('parsuje YAML korektně', () => {
    const parsed = parseYaml(yaml)
    expect(parsed).toBeTruthy()
    expect(parsed.projects).toEqual([])
    expect(parsed.personas).toHaveLength(1)
    expect(parsed.personas[0].code).toBe('PER-001')
  })

  it('hasData check projde', () => {
    const parsed = parseYaml(yaml)
    const ENTITY_KEYS = [
      'goals', 'stakeholders', 'competitions', 'hypotheses',
      'personas', 'scenarios', 'requirements', 'activities', 'teamMembers',
    ]
    const hasData =
      parsed.project ||
      ENTITY_KEYS.some((k) => Array.isArray(parsed[k]) && parsed[k].length > 0)
    expect(hasData).toBe(true)
  })

  it('analyzeImport vrátí plán s personou', () => {
    const parsed = parseYaml(yaml)
    const plan = analyzeImport(parsed, currentState, 'proj-1')
    expect(plan).toBeTruthy()
    expect(plan.personas).toHaveLength(1)
    expect(plan.personas[0].action).toBe('create')
    expect(plan.personas[0].item.code).toBe('PER-001')
  })

  it('analyzeImport funguje i s __new__', () => {
    const parsed = parseYaml(yaml)
    const plan = analyzeImport(parsed, currentState, '__new__')
    expect(plan).toBeTruthy()
    expect(plan.personas).toHaveLength(1)
    expect(plan.personas[0].action).toBe('create')
  })

  it('buildImportData vytvoří správná data pro import do existujícího projektu', () => {
    const parsed = parseYaml(yaml)
    const plan = analyzeImport(parsed, currentState, 'proj-1')
    const selections = {
      project: false,
      goals: [],
      stakeholders: [],
      competitions: [],
      hypotheses: [],
      personas: [true],
      scenarios: [],
      requirements: [],
      activities: [],
      teamMembers: [],
    }
    const importData = buildImportData(plan, selections, 'proj-1', currentState, false)
    expect(importData.effectiveProjectId).toBe('proj-1')
    expect(importData.upserts.personas).toHaveLength(1)
    expect(importData.upserts.personas[0].prepared.projectId).toBe('proj-1')
    expect(importData.upserts.personas[0].prepared.code).toBe('PER-001')
  })
})
