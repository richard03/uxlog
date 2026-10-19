/**
 * Unit testy pro načítání konfigurace z /data/*.yaml.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  ACTIVITY_CONFIG, ENTITY_CONFIG, APP_CONFIG,
  parseConfigYaml, normalizeActivityConfig, normalizeEntityConfig, normalizeAppConfig, normalizeCanvasCardColors,
  getEntityDefaults, getCodePrefix,
} from './dataConfig.js'
import { evaluateCompleteness } from './completeness.js'

describe('data/*.yaml – načtení', () => {
  it('activity-types.yaml obsahuje skupiny a typy s checklistem a metodikou', () => {
    expect(ACTIVITY_CONFIG.groups).toEqual(['project', 'research', 'design'])
    expect(ACTIVITY_CONFIG.types.length).toBeGreaterThan(20)
    for (const t of ACTIVITY_CONFIG.types) {
      expect(t.checklist.length, t.key).toBeGreaterThan(0)
      expect(t.guide.steps.length, t.key).toBeGreaterThan(0)
    }
  })

  it('entities.yaml definuje všechny entity s výchozími hodnotami', () => {
    for (const type of ['project', 'goal', 'stakeholder', 'competition', 'hypothesis', 'risk', 'persona', 'scenario', 'requirement', 'activity', 'teamMember', 'task', 'bug']) {
      expect(ENTITY_CONFIG[type], type).toBeDefined()
      expect(Object.keys(ENTITY_CONFIG[type].defaults).length, type).toBeGreaterThan(0)
    }
    expect(getCodePrefix('persona')).toBe('PER')
    expect(getCodePrefix('stakeholder')).toBe('')
    expect(getCodePrefix('neexistuje')).toBe('')
  })

  it('app.yaml obsahuje barvy, délky projektů a práh doporučení', () => {
    expect(APP_CONFIG.projectColors.length).toBeGreaterThan(0)
    expect(APP_CONFIG.projectDurationDays).toEqual({ small: 30, medium: 60, large: 120 })
    expect(APP_CONFIG.recommendations.minRequirementsForPrioritization).toBe(5)
  })

  it('getEntityDefaults vrací nezávislou kopii', () => {
    const a = getEntityDefaults('persona')
    a.scenarioIds.push('x')
    a.customFields.y = 1
    expect(getEntityDefaults('persona').scenarioIds).toEqual([])
    expect(getEntityDefaults('persona').customFields).toEqual({})
    expect(getEntityDefaults('neexistuje')).toEqual({})
  })
})

describe('normalizace – poškozená konfigurace', () => {
  it('parseConfigYaml vrátí prázdnou mapu pro neplatný vstup', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseConfigYaml('- jen seznam', 'x.yaml')).toEqual({})
    expect(parseConfigYaml(null, 'x.yaml')).toEqual({})
    warn.mockRestore()
  })

  it('aktivity: vynechá typy bez klíče a duplicity, doplní výchozí hodnoty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = normalizeActivityConfig({
      types: [
        { key: 'a', group: 'neznama', checklist: [{ id: 'x', label: 'X' }, { id: 'x' }, null, { label: 'bez id' }], guide: { steps: ['1', 2] } },
        { key: 'a' },
        { defaultName: 'bez klíče' },
      ],
    })
    expect(c.groups).toEqual(['project', 'research', 'design'])
    expect(c.types).toHaveLength(1)
    expect(c.types[0]).toMatchObject({ key: 'a', group: 'project', defaultName: 'a', sortOrder: 9999, defaultDurationDays: 1, createOnNewProject: false })
    expect(c.types[0].checklist).toEqual([{ id: 'x', label: 'X' }])
    expect(c.types[0].guide.steps).toEqual(['1'])
    expect(normalizeActivityConfig(null).types).toEqual([])
    warn.mockRestore()
  })

  it('entity: zahodí neplatná pole a normalizuje úplnost', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = normalizeEntityConfig({
      entities: {
        persona: { codePrefix: ' PER ', defaults: { name: '' }, fields: [{ key: 'a', type: 'text' }, { key: 'b' }, null], completeness: ['name', { field: 'x', when: { field: 's', value: 1 } }, 5] },
        spatne: 'x',
      },
    })
    expect(c.spatne).toBeUndefined()
    expect(c.persona.codePrefix).toBe('PER')
    expect(c.persona.fields).toEqual([{ key: 'a', type: 'text' }])
    expect(c.persona.completeness).toEqual([{ field: 'name', when: null }, { field: 'x', when: { field: 's', value: 1 } }])
    warn.mockRestore()
  })

  it('app: neplatné barvy a čísla nahradí výchozími', () => {
    const c = normalizeAppConfig({ projectColors: ['red', '#abc'], projectDurationDays: { small: 'x' } })
    expect(c.projectColors).toEqual(['#abc'])
    expect(c.projectDurationDays.small).toBe(30)
    expect(normalizeAppConfig(undefined).projectColors.length).toBe(1)
  })

  it('paleta kartiček Canvasu: app.yaml má platné barvy, normalizace toleruje chyby', () => {
    expect(APP_CONFIG.canvasCardColors.length).toBeGreaterThan(5)
    for (const c of APP_CONFIG.canvasCardColors) {
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/)
      expect(c.labelKey).toBeTruthy()
    }
    expect(normalizeCanvasCardColors([
      { color: '#FDE68A', labelKey: 'yellow' }, '#abc', { color: '#fde68a' }, { color: 'red' }, null, { labelKey: 'x' },
    ])).toEqual([{ color: '#fde68a', labelKey: 'yellow' }, { color: '#aabbcc', labelKey: null }])
    expect(normalizeAppConfig({ canvasCardColors: 'nesmysl' }).canvasCardColors).toEqual([{ color: '#fde68a', labelKey: 'yellow' }])
  })
})

describe('evaluateCompleteness', () => {
  it('podmíněné pole se počítá jen při splněné podmínce', () => {
    const checks = [{ field: 'name', when: null }, { field: 'explanation', when: { field: 'status', value: 'refuted' } }]
    expect(evaluateCompleteness({ name: 'H', status: 'tested' }, checks)).toEqual([true])
    expect(evaluateCompleteness({ name: 'H', status: 'refuted' }, checks)).toEqual([true, false])
    expect(evaluateCompleteness(null, checks)).toEqual([false])
  })
})
