import { describe, it, expect } from 'vitest'
import {
  isConvertibleCollection, conversionTargets, fieldValueText, mainTextField,
  buildConversionDraft, retargetConnections, ENTITY_TYPE_BY_COLLECTION, pairConversionFields,
} from './entityConversion.js'
import { ENTITY_CONFIG } from './dataConfig.js'
import { renameCanvasCard } from './canvas.js'

const requirementFields = [
  { key: 'description', label: 'Popis', type: 'textarea' },
  { key: 'motivation', label: 'Motivace', type: 'textarea' },
  { key: 'category', label: 'Kategorie', type: 'select', options: [{ value: 'data', label: 'Data' }] },
  { key: 'priority', label: 'Priorita', type: 'select', options: [{ value: 'must', label: 'Must' }, { value: 'could', label: 'Could' }] },
  { key: 'url', label: 'Odkaz', type: 'url' },
]

const scenarioFields = [
  { key: 'description', label: 'Popis', type: 'textarea' },
  { key: 'trigger', label: 'Spouštěč', type: 'textarea' },
  { key: 'type', label: 'Typ', type: 'select', options: [{ value: 'main', label: 'Hlavní' }] },
  { key: 'priority', label: 'Priorita', type: 'select', options: [{ value: 'must', label: 'Must' }, { value: 'could', label: 'Could' }] },
  { key: 'frequency', label: 'Frekvence', type: 'number-unit', valueKey: 'frequencyValue', unitKey: 'frequencyUnit', units: [{ value: 'daily', label: 'denně' }] },
  { key: 'url', label: 'Odkaz', type: 'url' },
]

describe('isConvertibleCollection / conversionTargets', () => {
  it('artefakty projektu jdou převádět, aktivity, zdroje a členové týmu ne', () => {
    expect(isConvertibleCollection('requirements')).toBe(true)
    expect(isConvertibleCollection('scenarios')).toBe(true)
    expect(isConvertibleCollection('activities')).toBe(false)
    expect(isConvertibleCollection('sources')).toBe(false)
    expect(isConvertibleCollection('teamMembers')).toBe(false)
    expect(isConvertibleCollection('nic')).toBe(false)
  })

  it('cíle převodu jsou ostatní převoditelné kolekce', () => {
    const targets = conversionTargets('requirements')
    expect(targets).toContain('scenarios')
    expect(targets).not.toContain('requirements')
    expect(targets).not.toContain('activities')
    expect(conversionTargets('activities')).toEqual([])
  })

  it('řídí se konfigurací entit', () => {
    const config = { goal: { convertible: true }, risk: { convertible: true }, bug: {} }
    expect(conversionTargets('goals', config)).toEqual(['risks'])
    expect(isConvertibleCollection('bugs', config)).toBe(false)
  })

  it('každá kolekce má typ v data/entities.yaml', () => {
    for (const type of Object.values(ENTITY_TYPE_BY_COLLECTION)) expect(ENTITY_CONFIG[type]).toBeTruthy()
  })
})

describe('fieldValueText', () => {
  it('select vrací popisek volby, neznámá hodnota zůstane', () => {
    expect(fieldValueText(requirementFields[3], { priority: 'must' })).toBe('Must')
    expect(fieldValueText(requirementFields[3], { priority: 'jina' })).toBe('jina')
    expect(fieldValueText(requirementFields[3], { priority: '' })).toBe('')
  })

  it('number-unit připojí jednotku', () => {
    expect(fieldValueText(scenarioFields[4], { frequencyValue: '5', frequencyUnit: 'daily' })).toBe('5 denně')
    expect(fieldValueText(scenarioFields[4], { frequencyValue: '', frequencyUnit: 'daily' })).toBe('')
  })

  it('custom pole a poškozená data', () => {
    expect(fieldValueText({ key: '_cf_a', id: 'a', isCustom: true, type: 'text' }, { customFields: { a: 'x' } })).toBe('x')
    expect(fieldValueText({ key: 'description', type: 'textarea' }, { description: ['a', 'b'] })).toBe('a\nb')
    expect(fieldValueText({ key: 'description', type: 'textarea' }, { description: '   ' })).toBe('')
    expect(fieldValueText(null, {})).toBe('')
  })
})

describe('mainTextField', () => {
  it('přednost má popis, pak první víceřádkové pole', () => {
    expect(mainTextField(scenarioFields).key).toBe('description')
    expect(mainTextField([{ key: 'a', type: 'text' }, { key: 'b', type: 'textarea' }]).key).toBe('b')
    expect(mainTextField([{ key: 'a', type: 'text' }]).key).toBe('a')
    expect(mainTextField([{ key: 'x', type: 'select' }])).toBe(null)
    expect(mainTextField(null)).toBe(null)
  })
})

describe('buildConversionDraft', () => {
  const requirement = {
    name: 'Export do PDF',
    description: 'Uživatel exportuje přehled.',
    motivation: 'Sdílení s vedením',
    category: 'data',
    priority: 'must',
    url: 'https://example.com',
  }

  it('přenese pole se stejným klíčem a zbytek připojí do popisu', () => {
    const draft = buildConversionDraft(requirement, requirementFields, scenarioFields)
    expect(draft.values.name).toBe('Export do PDF')
    expect(draft.values.priority).toBe('must')
    expect(draft.values.url).toBe('https://example.com')
    expect(draft.values.description).toBe('Uživatel exportuje přehled.\n\nMotivace: Sdílení s vedením\n\nKategorie: Data')
    expect(draft.mainFieldKey).toBe('description')
    expect(draft.transfers).toEqual({
      description: 'description', priority: 'priority', url: 'url', motivation: 'description', category: 'description',
    })
  })

  it('volbu, kterou cílové pole nezná, připojí do popisu', () => {
    const fields = [...scenarioFields.slice(0, 3), { ...scenarioFields[3], options: [{ value: 'could', label: 'Could' }] }]
    const draft = buildConversionDraft({ name: 'X', priority: 'must' }, requirementFields, fields)
    expect(draft.values.priority).toBeUndefined()
    expect(draft.values.description).toBe('Priorita: Must')
  })

  it('víceřádkovou hodnotu připojí pod popisek', () => {
    const draft = buildConversionDraft({ motivation: 'a\nb' }, requirementFields, scenarioFields)
    expect(draft.values.description).toBe('Motivace:\na\nb')
  })

  it('přenese number-unit i s jednotkou a text do textu', () => {
    const source = [{ key: 'frequency', label: 'Frekvence', type: 'number-unit', valueKey: 'frequencyValue', unitKey: 'frequencyUnit' }]
    const draft = buildConversionDraft({ frequencyValue: '3', frequencyUnit: 'daily' }, source, scenarioFields)
    expect(draft.values).toMatchObject({ frequencyValue: '3', frequencyUnit: 'daily' })
  })

  it('custom pole se párují podle popisku', () => {
    const source = [...requirementFields, { key: '_cf_s', id: 's', label: 'Zdroj', type: 'text', isCustom: true }]
    const target = [...scenarioFields, { key: '_cf_t', id: 't', label: 'motivace', type: 'textarea', isCustom: true }, { key: '_cf_u', id: 'u', label: ' zdroj ', type: 'text', isCustom: true }]
    const draft = buildConversionDraft({ ...requirement, customFields: { s: 'Rozhovor' } }, source, target)
    expect(draft.customFields).toEqual({ t: 'Sdílení s vedením', u: 'Rozhovor' })
    expect(draft.values.description).toBe('Uživatel exportuje přehled.\n\nKategorie: Data')
  })

  it('bez textového pole v cíli se nic nepřipojuje', () => {
    const draft = buildConversionDraft(requirement, requirementFields, [{ key: 'priority', type: 'select', options: [] }])
    expect(draft.values).toEqual({ name: 'Export do PDF', priority: 'must' })
    expect(draft.mainFieldKey).toBe(null)
  })

  it('pole bez přenesené hodnoty začínají výchozími hodnotami nového typu', () => {
    const defaults = { type: 'main', priority: 'could', frequencyValue: '', frequencyUnit: 'daily', description: '', personaIds: [] }
    const draft = buildConversionDraft({ name: 'X', priority: 'must' }, requirementFields, scenarioFields, defaults)
    expect(draft.values).toMatchObject({ type: 'main', priority: 'must', frequencyValue: '', frequencyUnit: 'daily' })
    expect(draft.values.personaIds).toBeUndefined()
  })

  it('snese chybějící a poškozená data', () => {
    expect(buildConversionDraft(null, null, null)).toEqual({ values: { name: '' }, customFields: {}, transfers: {}, mainFieldKey: null })
    const draft = buildConversionDraft({ name: 5, description: { a: 1 } }, requirementFields, scenarioFields)
    expect(draft.values.name).toBe('5')
    expect(draft.values.description).toBe('{"a":1}')
  })
})

describe('pairConversionFields', () => {
  it('stejná pole na jednom řádku v pořadí nového typu, zbytek původního na konci', () => {
    const rows = pairConversionFields(requirementFields, scenarioFields)
    expect(rows.map((r) => [r.source?.key ?? null, r.target?.key ?? null])).toEqual([
      ['description', 'description'],
      [null, 'trigger'],
      [null, 'type'],
      ['priority', 'priority'],
      [null, 'frequency'],
      ['url', 'url'],
      ['motivation', null],
      ['category', null],
    ])
  })

  it('custom pole páruje podle popisku', () => {
    const rows = pairConversionFields(
      [{ key: 'motivation', label: 'Motivace', type: 'textarea' }],
      [{ key: '_cf_x', id: 'x', label: ' motivace', type: 'textarea', isCustom: true }],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].source.key).toBe('motivation')
  })

  it('snese chybějící vstupy', () => {
    expect(pairConversionFields(null, undefined)).toEqual([])
  })
})

describe('retargetConnections', () => {
  const from = { type: 'requirements', id: 'r1' }
  const to = { type: 'scenarios', id: 's9' }
  const conn = (id, t1, i1, t2, i2) => ({ id, projectId: 'p', entityType1: t1, entityId1: i1, entityType2: t2, entityId2: i2, note: '' })

  it('přesměruje obě strany souvislostí', () => {
    const list = [conn('a', 'requirements', 'r1', 'personas', 'p1'), conn('b', 'goals', 'g1', 'requirements', 'r1'), conn('c', 'goals', 'g1', 'personas', 'p1')]
    const out = retargetConnections(list, from, to)
    expect(out.map((c) => [c.id, c.entityType1, c.entityId1, c.entityType2, c.entityId2])).toEqual([
      ['a', 'scenarios', 's9', 'personas', 'p1'],
      ['b', 'goals', 'g1', 'scenarios', 's9'],
      ['c', 'goals', 'g1', 'personas', 'p1'],
    ])
    expect(out[2]).toBe(list[2])
  })

  it('vyřadí zdvojené souvislosti a smyčky', () => {
    const list = [
      conn('a', 'requirements', 'r1', 'personas', 'p1'),
      conn('b', 'personas', 'p1', 'scenarios', 's9'),
      conn('c', 'requirements', 'r1', 'scenarios', 's9'),
    ]
    expect(retargetConnections(list, from, to).map((c) => c.id)).toEqual(['b'])
  })

  it('neplatný vstup vrátí původní pole', () => {
    expect(retargetConnections(null, from, to)).toEqual([])
    const list = [conn('a', 'requirements', 'r1', 'personas', 'p1')]
    expect(retargetConnections(list, null, to)).toBe(list)
  })
})

describe('renameCanvasCard', () => {
  it('přenese pozici a barvu na nový klíč', () => {
    const layout = { positions: { 'requirements:r1': { x: 10, y: 20 }, 'goals:g': { x: 0, y: 0 } }, colors: { 'requirements:r1': '#fde68a' } }
    const out = renameCanvasCard(layout, 'requirements:r1', 'scenarios:s9')
    expect(out.positions).toEqual({ 'goals:g': { x: 0, y: 0 }, 'scenarios:s9': { x: 10, y: 20 } })
    expect(out.colors).toEqual({ 'scenarios:s9': '#fde68a' })
  })

  it('kartička bez pozice zůstane bez pozice', () => {
    const out = renameCanvasCard({}, 'requirements:r1', 'scenarios:s9')
    expect(out.positions).toEqual({})
  })
})
