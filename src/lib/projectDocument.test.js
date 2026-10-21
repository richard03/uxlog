import { describe, it, expect } from 'vitest'
import {
  DOCUMENT_SECTIONS, valueToText, normalizeDocumentText, documentField, entityFieldUpdate,
  buildProjectDocument, documentToMarkdown, foldSearchText, findTextMatches,
} from './projectDocument.js'

const personaFields = [
  { key: 'status', label: 'Stav', type: 'select', options: [{ value: 'persona', label: 'Persona' }] },
  { key: 'description', label: 'Popis', type: 'textarea' },
  { key: 'quote', label: 'Citát', type: 'text' },
  { key: '_cf_x', id: 'x', label: 'Vlastní', type: 'text', isCustom: true },
]
const scenarioFields = [
  {
    key: 'frequency', label: 'Frekvence', type: 'number-unit', valueKey: 'frequencyValue', unitKey: 'frequencyUnit',
    units: [{ value: 'daily', label: 'denně' }],
  },
  { key: 'wontHaveExplanation', label: 'Proč ne', type: 'textarea', visibleWhen: { field: 'priority', value: 'wont' } },
]

const data = {
  projects: [{ id: 'p1', name: 'Projekt\nA' }],
  personas: [
    { id: 'b', projectId: 'p1', name: 'Druhá', sortOrder: 2, status: 'persona', description: 'Text', customFields: { x: 'v' } },
    { id: 'a', projectId: 'p1', code: 'PER-001', name: 'První', sortOrder: 1, quote: 'Ahoj' },
    { id: 'c', projectId: 'p2', name: 'Jiný projekt' },
    null,
  ],
  scenarios: [{ id: 's', projectId: 'p1', name: 'Nákup', priority: 'must', frequencyValue: '3', frequencyUnit: 'daily' }],
  activities: [
    { id: 'x1', projectId: 'p1', name: 'Kick-off', description: 'Poznámka' },
    { id: 'x2', projectId: 'p1', name: 'Skrytá', dismissed: true },
  ],
}
const fields = { persona: personaFields, scenario: scenarioFields, activity: [{ key: 'description', label: 'Poznámky', type: 'textarea' }] }

describe('valueToText / normalizeDocumentText', () => {
  it('převede různé hodnoty na text', () => {
    expect(valueToText(null)).toBe('')
    expect(valueToText(3)).toBe('3')
    expect(valueToText(['a', null, 'b'])).toBe('a\nb')
    expect(valueToText({ a: 1 })).toBe('{"a":1}')
  })

  it('normalizuje víceřádkový i jednořádkový text', () => {
    expect(normalizeDocumentText('\n\nA  \r\nB \n\n')).toBe('A\nB')
    expect(normalizeDocumentText('  A\n  B  ', { single: true })).toBe('A B')
    expect(normalizeDocumentText(undefined)).toBe('')
  })
})

describe('documentField', () => {
  it('select zobrazí popisek volby, neznámá hodnota zůstane', () => {
    expect(documentField(personaFields[0], { status: 'persona' })).toMatchObject({ display: 'Persona', empty: false, block: false, editable: false })
    expect(documentField(personaFields[0], { status: 'jiny' }).display).toBe('jiny')
    expect(documentField(personaFields[0], {}).empty).toBe(true)
  })

  it('number-unit spojí hodnotu s jednotkou', () => {
    expect(documentField(scenarioFields[0], { frequencyValue: '3', frequencyUnit: 'daily' })).toMatchObject({ display: '3 denně', value: '3', unit: 'daily' })
    expect(documentField(scenarioFields[0], {}).empty).toBe(true)
  })

  it('textarea je blok, vlastní pole čte z customFields', () => {
    expect(documentField(personaFields[1], { description: 'X' })).toMatchObject({ block: true, editable: true, text: 'X' })
    expect(documentField(personaFields[3], { customFields: { x: 'v' } }).text).toBe('v')
    expect(documentField(personaFields[3], {}).empty).toBe(true)
  })
})

describe('entityFieldUpdate', () => {
  it('uloží jen změněný text a jednořádkové pole spojí', () => {
    expect(entityFieldUpdate(personaFields[1], { description: 'A' }, 'A\n')).toBeNull()
    expect(entityFieldUpdate(personaFields[1], { description: 'A' }, 'A\nB')).toEqual({ description: 'A\nB' })
    expect(entityFieldUpdate(personaFields[2], {}, 'a\nb')).toEqual({ quote: 'a b' })
    // Text, který se liší jen normalizací (mezery na konci), se za změnu nepovažuje
    expect(entityFieldUpdate(personaFields[1], { description: 'A  \n' }, 'A')).toBeNull()
  })

  it('vlastní pole sloučí do customFields', () => {
    expect(entityFieldUpdate(personaFields[3], { customFields: { y: 1 } }, 'nové')).toEqual({ customFields: { y: 1, x: 'nové' } })
  })

  it('number-unit mění hodnotu i jednotku', () => {
    const e = { frequencyValue: '3', frequencyUnit: 'daily' }
    expect(entityFieldUpdate(scenarioFields[0], e, '3')).toBeNull()
    expect(entityFieldUpdate(scenarioFields[0], e, '3', 'monthly')).toEqual({ frequencyUnit: 'monthly' })
    expect(entityFieldUpdate(scenarioFields[0], e, '5')).toEqual({ frequencyValue: '5' })
  })

  it('select uloží hodnotu, chybějící entita nebo pole → null', () => {
    expect(entityFieldUpdate(personaFields[0], { status: '' }, 'persona')).toEqual({ status: 'persona' })
    expect(entityFieldUpdate(null, {}, 'x')).toBeNull()
    expect(entityFieldUpdate(personaFields[0], null, 'x')).toBeNull()
  })
})

describe('buildProjectDocument', () => {
  const doc = buildProjectDocument(data, 'p1', { fields, sectionTitles: { personas: 'Persony' }, meta: [{ label: 'Fáze', value: 'Výzkum' }, { label: 'Prázdné', value: '' }] })

  it('neexistující projekt → null', () => {
    expect(buildProjectDocument(data, 'nic')).toBeNull()
    expect(buildProjectDocument(null, 'p1')).toBeNull()
  })

  it('sekce v pořadí, jen neprázdné, entity podle sortOrder a jen z projektu', () => {
    expect(doc.title).toBe('Projekt A')
    expect(doc.meta).toEqual([{ label: 'Fáze', value: 'Výzkum' }])
    expect(doc.sections.map((s) => s.stateKey)).toEqual(['personas', 'scenarios', 'activities'])
    expect(doc.sections[0].title).toBe('Persony')
    expect(doc.sections[1].title).toBe('scenarios')
    expect(doc.sections[0].items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(doc.sections[0].items[0]).toMatchObject({ key: 'personas:a', code: 'PER-001', name: 'První' })
  })

  it('rozdělí pole na vlastnosti a bloky, respektuje visibleWhen a skryté aktivity', () => {
    const second = doc.sections[0].items[1]
    expect(second.props.map((f) => f.key)).toEqual(['status', 'quote', '_cf_x'])
    expect(second.blocks.map((f) => f.key)).toEqual(['description'])
    expect(doc.sections[1].items[0].blocks).toEqual([])
    expect(doc.sections[2].items.map((i) => i.id)).toEqual(['x1'])
  })

  it('všechny sekce mají jedinečný typ', () => {
    expect(new Set(DOCUMENT_SECTIONS.map((s) => s.stateKey)).size).toBe(DOCUMENT_SECTIONS.length)
  })
})

describe('documentToMarkdown', () => {
  it('vytvoří nadpisy, seznam vlastností a odstavce bez prázdných polí', () => {
    const doc = buildProjectDocument(data, 'p1', { fields, sectionTitles: { personas: 'Persony', scenarios: 'Scénáře', activities: 'Aktivity' }, meta: [{ label: 'Fáze', value: 'Výzkum' }] })
    expect(documentToMarkdown(doc)).toBe([
      '# Projekt A',
      '',
      '- **Fáze:** Výzkum',
      '',
      '## Persony',
      '',
      '### PER-001 První',
      '',
      '- **Citát:** Ahoj',
      '',
      '### Druhá',
      '',
      '- **Stav:** Persona',
      '- **Vlastní:** v',
      '',
      '#### Popis',
      '',
      'Text',
      '',
      '## Scénáře',
      '',
      '### Nákup',
      '',
      '- **Frekvence:** 3 denně',
      '',
      '## Aktivity',
      '',
      '### Kick-off',
      '',
      '#### Poznámky',
      '',
      'Poznámka',
      '',
    ].join('\n'))
  })

  it('entita bez názvu dostane náhradní název; bez dokumentu prázdný řetězec', () => {
    const doc = buildProjectDocument({ projects: [{ id: 'p' }], goals: [{ id: 'g', projectId: 'p' }] }, 'p', { sectionTitles: { goals: 'Cíle' } })
    expect(documentToMarkdown(doc, { untitled: 'Bez názvu' })).toBe('# Bez názvu\n\n## Cíle\n\n### Bez názvu\n')
    expect(documentToMarkdown(null)).toBe('')
  })
})

describe('vyhledávání v dokumentu', () => {
  it('foldSearchText zachová délku a odstraní diakritiku', () => {
    expect(foldSearchText('Žluťoučký Kůň')).toBe('zlutoucky kun')
    expect(foldSearchText('Žluťoučký Kůň')).toHaveLength('Žluťoučký Kůň'.length)
  })

  it('najde výskyty bez ohledu na velikost písmen a diakritiku', () => {
    expect(findTextMatches('Nákup a NAKUP, nakupní', 'nakup')).toEqual([
      { start: 0, end: 5 }, { start: 8, end: 13 }, { start: 15, end: 20 },
    ])
  })

  it('mezera v dotazu odpovídá i zalomení řádku, výskyty se nepřekrývají', () => {
    expect(findTextMatches('jedna\ndva', 'jedna dva')).toEqual([{ start: 0, end: 9 }])
    expect(findTextMatches('aaaa', 'aa')).toEqual([{ start: 0, end: 2 }, { start: 2, end: 4 }])
  })

  it('indexy počítá v UTF-16 i za emoji; prázdný dotaz nic nenajde', () => {
    expect(findTextMatches('😀 test', 'test')).toEqual([{ start: 3, end: 7 }])
    expect(findTextMatches('text', '  ')).toEqual([])
    expect(findTextMatches(null, 'a')).toEqual([])
  })
})
