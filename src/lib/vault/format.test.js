import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import {
  entityToMarkdown, markdownToEntity, projectToMarkdown, markdownToProject, connectionsToYaml,
  yamlToConnections, getBodyFields, isBodySafeText, splitFrontmatter, parseBody, normalizeHeading,
  createHeadingResolver, applyDefaults, dataToYaml, yamlToData,
} from './format.js'
import { VAULT_COLLECTIONS } from './paths.js'
import { ENTITY_CONFIG, getEntityDefaults } from '../dataConfig.js'

const headingFor = createHeadingResolver(cs)
const opts = { headingFor }

/** Entita s vyplněnými textovými poli a vazbami pro test převodu tam a zpět. */
function sampleEntity(entityType, overrides = {}) {
  const entity = {
    id: `id-${entityType}`,
    projectId: 'p1',
    ...getEntityDefaults(entityType),
    name: `Ukázka ${entityType}`,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-11-01T10:30:00.000Z',
  }
  for (const key of getBodyFields(entityType)) entity[key] = `Text pole ${key}\n\n- odrážka\n- další: s dvojtečkou #2`
  for (const key of Object.keys(entity)) {
    if (/Ids$/.test(key) && Array.isArray(entity[key])) entity[key] = ['ref-1', 'ref-2']
  }
  return { ...entity, ...overrides }
}

function roundTrip(entityType, entity) {
  const text = entityToMarkdown(entityType, entity, opts)
  const result = markdownToEntity(entityType, text, opts)
  expect(result.ok).toBe(true)
  return { text, result }
}

const withoutProjectId = ({ projectId: _p, ...rest }) => rest

describe('createHeadingResolver', () => {
  it('vrátí popisek z i18n podle labelKey, jinak klíč', () => {
    expect(headingFor('persona', 'motivation')).toBe('Motivace')
    expect(headingFor('persona', 'neexistuje')).toBe('neexistuje')
    expect(createHeadingResolver({})('persona', 'motivation')).toBe('motivation')
  })
})

describe('getBodyFields', () => {
  it('vrátí textarea pole v pořadí formuláře', () => {
    expect(getBodyFields('persona')).toEqual([
      'description', 'motivation', 'needs', 'problems', 'barriers', 'context', 'recruitmentCriteria',
    ])
  })

  it('entita bez formuláře má v těle description', () => {
    expect(getBodyFields('activity')).toEqual(['description'])
    expect(getBodyFields('neznamy')).toEqual([])
  })
})

describe('entityToMarkdown', () => {
  it('zapíše frontmatter, název jako H1 a textová pole jako sekce', () => {
    const persona = sampleEntity('persona', {
      code: 'PER-001', name: 'Anna, učitelka', motivation: 'Ušetřit čas', needs: '', scenarioIds: ['s1'],
    })
    const text = entityToMarkdown('persona', persona, { ...opts, refLabel: (id) => (id === 's1' ? 'SCN-002 Objednání' : null) })
    expect(text.startsWith('---\nid: id-persona\ncode: PER-001\n')).toBe(true)
    expect(text).toContain('\n# Anna, učitelka\n')
    expect(text).toContain('\n## Motivace\n\nUšetřit čas\n')
    expect(text).toContain('\n## Potřeby\n')
    expect(text).toContain('  - s1 # SCN-002 Objednání\n')
    expect(text).not.toContain('projectId')
    expect(text).not.toMatch(/^motivation:/m)
    expect(text.indexOf('updatedAt')).toBeGreaterThan(text.indexOf('scenarioIds'))
  })

  it('zachová textové řetězce, které vypadají jako čísla nebo boolean', () => {
    const persona = sampleEntity('persona', { targetGroupSize: '1200', targetGroupValue: 'true', code: '001' })
    const { result } = roundTrip('persona', persona)
    expect(result.entity.targetGroupSize).toBe('1200')
    expect(result.entity.targetGroupValue).toBe('true')
    expect(result.entity.code).toBe('001')
  })
})

describe('převod tam a zpět', () => {
  for (const { entityType } of VAULT_COLLECTIONS) {
    it(`je bezeztrátový pro ${entityType}`, () => {
      const entity = sampleEntity(entityType, { customFields: { vlastni: 'hodnota', cislo: 3 } })
      const { result } = roundTrip(entityType, entity)
      expect(result.entity).toEqual(withoutProjectId(entity))
      expect(result.warnings).toEqual([])
    })
  }

  it('je bezeztrátový pro aktivitu se strukturovaným checklistem', () => {
    const activity = sampleEntity('activity', {
      typeKey: 'interviews',
      checkedItems: ['a', 'b'],
      checklistLabels: { a: 'Vlastní: popisek' },
      customChecklistItems: [{ id: 'c1', label: 'Krok #3', done: false }],
      baseChecklist: null,
      checklistItemTaskIds: { a: 'task-1' },
    })
    const { result } = roundTrip('activity', activity)
    expect(result.entity).toEqual(withoutProjectId(activity))
  })

  const unsafeTexts = {
    'nadpis H2 v textu': 'Úvod\n## Podnadpis\nText',
    'nadpis H1 v textu': '# Nadpis',
    'prázdný řádek na začátku': '\nText',
    'mezery na konci': 'Text  ',
    'konce řádků CRLF': 'a\r\nb',
    'neuzavřený blok kódu': '```\nkód',
    'blok kódu uzavřený jiným plotem': '```\n~~~\n## nadpis',
  }
  for (const [label, value] of Object.entries(unsafeTexts)) {
    it(`text, který nejde do těla beze ztráty (${label}), zůstane ve frontmatteru`, () => {
      const persona = sampleEntity('persona', { motivation: value })
      const { text, result } = roundTrip('persona', persona)
      expect(text).not.toContain('## Motivace')
      expect(result.entity.motivation).toBe(value)
    })
  }

  it('podnadpisy H3 a uzavřený blok kódu s ## zůstanou v těle', () => {
    const value = '### Podnadpis\n\n```md\n## není sekce\n```\n\n    odsazený kód'
    const { text, result } = roundTrip('persona', sampleEntity('persona', { needs: value }))
    expect(text).toContain('## Potřeby\n\n### Podnadpis')
    expect(result.entity.needs).toBe(value)
  })

  const unsafeNames = { 'víceřádkový': 'A\nB', 'prázdný': '', 's mezerou na začátku': ' Anna', 's # na konci': 'Anna #', 'jen mřížky': '##' }
  for (const [label, name] of Object.entries(unsafeNames)) {
    it(`název ${label} se zapíše do frontmatteru`, () => {
      const persona = sampleEntity('persona', { name })
      const { text, result } = roundTrip('persona', persona)
      expect(text).not.toMatch(/^# /m)
      expect(result.entity.name).toBe(name)
    })
  }

  it('neznámé sekce a úvod se zachovají', () => {
    const persona = sampleEntity('persona', {
      extraSections: [
        { heading: '', content: 'Úvodní poznámka' },
        { heading: 'Poznámky z výzkumu', content: 'R3: citace' },
        { heading: 'Motivace', content: 'koliduje se známým polem' },
        { heading: 'Víceřádkový\nnadpis', content: 'x' },
      ],
    })
    const { text, result } = roundTrip('persona', persona)
    expect(text).toContain('# Ukázka persona\n\nÚvodní poznámka\n\n## Popis')
    expect(text).toContain('## Poznámky z výzkumu\n\nR3: citace')
    expect(result.entity.extraSections).toEqual(expect.arrayContaining(persona.extraSections))
    expect(result.entity.extraSections).toHaveLength(4)
  })

  it('převod bez popisků i18n používá klíče polí', () => {
    const persona = sampleEntity('persona')
    const text = entityToMarkdown('persona', persona)
    expect(text).toContain('## motivation')
    expect(markdownToEntity('persona', text).entity).toEqual(withoutProjectId(persona))
  })
})

describe('markdownToEntity – soubory psané ručně (Claude)', () => {
  it('soubor bez frontmatteru načte s výchozími hodnotami a varováním missingId', () => {
    const result = markdownToEntity('persona', '# Petr\n\n## motivace:\n\nChce rychlost\n', opts)
    expect(result.ok).toBe(true)
    expect(result.entity).toEqual({ ...getEntityDefaults('persona'), name: 'Petr', motivation: 'Chce rychlost' })
    expect(result.warnings).toEqual([{ code: 'missingId' }])
  })

  it('nadpisy porovná bez diakritiky a velikosti písmen, i podle klíče pole', () => {
    const text = '---\nid: x\n---\n# P\n\n## POTREBY\n\nA\n\n## barriers\n\nB\n\n## Prostředí a kontext ##\n\nC\n'
    const { entity } = markdownToEntity('persona', text, opts)
    expect(entity.needs).toBe('A')
    expect(entity.barriers).toBe('B')
    expect(entity.context).toBe('C')
  })

  it('zvládne CRLF, BOM, inline seznamy a blokové řetězce', () => {
    const text = '﻿---\r\nid: 42\r\nscenarioIds: [a, b]\r\nrequirementIds: c\r\ntargetGroupSize: 1200\r\nquote: |\r\n  Řádek 1\r\n  Řádek 2\r\n---\r\n# Jana\r\n'
    const { entity } = markdownToEntity('persona', text, opts)
    expect(entity.id).toBe('42')
    expect(entity.scenarioIds).toEqual(['a', 'b'])
    expect(entity.requirementIds).toEqual(['c'])
    expect(entity.targetGroupSize).toBe('1200')
    expect(entity.quote).toBe('Řádek 1\nŘádek 2\n')
  })

  it('neprázdný text v těle má přednost před frontmatterem (s varováním)', () => {
    const text = '---\nid: x\nname: Stará\nmotivation: z frontmatteru\nneeds: zůstane\n---\n# Nová\n\n## Motivace\n\nz těla\n\n## Potřeby\n'
    const result = markdownToEntity('persona', text, opts)
    expect(result.entity.name).toBe('Nová')
    expect(result.entity.motivation).toBe('z těla')
    expect(result.entity.needs).toBe('zůstane')
    expect(result.warnings).toEqual([
      { code: 'duplicateField', field: 'name' },
      { code: 'duplicateField', field: 'motivation' },
    ])
  })

  it('opakovaná sekce známého pole skončí v extraSections', () => {
    const text = '---\nid: x\n---\n# P\n\n## Motivace\n\nA\n\n## Motivace\n\nB\n'
    const result = markdownToEntity('persona', text, opts)
    expect(result.entity.motivation).toBe('A')
    expect(result.entity.extraSections).toEqual([{ heading: 'Motivace', content: 'B' }])
    expect(result.warnings).toContainEqual({ code: 'duplicateSection', field: 'motivation' })
  })

  it('komentáře u odkazů ignoruje a prázdná id ve vazbách vyhodí', () => {
    const text = '---\nid: x\nscenarioIds:\n  - s1 # SCN-001 Něco\n  - ""\n  - null\n---\n'
    expect(markdownToEntity('persona', text).entity.scenarioIds).toEqual(['s1'])
  })

  it('projectId ze souboru ignoruje (projekt určuje složka)', () => {
    const { entity } = markdownToEntity('goal', '---\nid: g\nprojectId: cizi\n---\n# Cíl\n')
    expect(entity.projectId).toBeUndefined()
  })

  it('chyba syntaxe YAML vrátí kód a číslo řádku v souboru', () => {
    const result = markdownToEntity('persona', '---\nid: x\nname: [neuzavřené\n---\n')
    expect(result.ok).toBe(false)
    expect(result.errors[0].code).toBe('yamlSyntax')
    expect(result.errors[0].line).toBeGreaterThanOrEqual(3)
  })

  it('duplicitní klíč ve frontmatteru je chyba', () => {
    expect(markdownToEntity('persona', '---\nid: a\nid: b\n---\n').ok).toBe(false)
  })

  it('neukončený frontmatter a frontmatter, který není mapa, jsou chyby', () => {
    expect(markdownToEntity('persona', '---\nid: x\n# P').errors[0].code).toBe('frontmatterUnterminated')
    expect(markdownToEntity('persona', '---\n- a\n- b\n---\n').errors[0].code).toBe('frontmatterNotMap')
  })

  it('prázdný vstup vrátí entitu s výchozími hodnotami', () => {
    const result = markdownToEntity('goal', null)
    expect(result.ok).toBe(true)
    expect(result.entity).toEqual(getEntityDefaults('goal'))
  })
})

describe('pomocné funkce', () => {
  it('isBodySafeText', () => {
    expect(isBodySafeText('a\n\nb')).toBe(true)
    expect(isBodySafeText('')).toBe(true)
    expect(isBodySafeText(null)).toBe(false)
    expect(isBodySafeText('# x', { allowHeadings: true })).toBe(true)
    expect(isBodySafeText('#hashtag')).toBe(true)
  })

  it('splitFrontmatter', () => {
    expect(splitFrontmatter('bez frontmatteru')).toMatchObject({ frontmatter: null, body: 'bez frontmatteru' })
    expect(splitFrontmatter('---\na: 1\n...\ntělo')).toMatchObject({ frontmatter: 'a: 1', body: 'tělo' })
  })

  it('parseBody bez H1 dá text do úvodu', () => {
    expect(parseBody('úvod\n## A\nobsah')).toEqual({ name: null, preamble: 'úvod', sections: [{ heading: 'A', content: 'obsah' }] })
  })

  it('normalizeHeading', () => {
    expect(normalizeHeading('  Prostředí  a KONTEXT: ')).toBe('prostredi a kontext')
  })

  it('applyDefaults sjednotí typy podle výchozích hodnot', () => {
    const out = applyDefaults(
      { name: null, targetGroupSize: 5, scenarioIds: null, customFields: null, extra: 1 },
      ENTITY_CONFIG.persona.defaults,
    )
    expect(out.name).toBe('')
    expect(out.targetGroupSize).toBe('5')
    expect(out.scenarioIds).toEqual([])
    expect(out.customFields).toEqual({})
    expect(out.extra).toBe(1)
    expect(out.status).toBe('protopersona')
  })

  it('applyDefaults nezahodí data, která nejde převést (neprázdný seznam místo mapy)', () => {
    const defaults = ENTITY_CONFIG.activity.defaults
    expect(applyDefaults({ checklistLabels: [] }, defaults).checklistLabels).toEqual({})
    expect(applyDefaults({ checklistLabels: ['a'] }, defaults).checklistLabels).toEqual(['a'])
  })

  it('dataToYaml a yamlToData', () => {
    const value = { positions: { 'personas:abc': { x: 1, y: 2 } }, viewport: { zoom: 1.5 } }
    expect(yamlToData(dataToYaml(value))).toEqual({ ok: true, data: value })
    expect(yamlToData('a: [').ok).toBe(false)
  })
})

describe('projekt', () => {
  const project = {
    id: 'p1',
    ...getEntityDefaults('project'),
    name: 'E-shop redesign',
    notebook: '# Schůzka 1\n\nPoznámky\n\n## Úkoly\n- a',
    notebookHistory: [{ role: 'user', text: 'x' }],
    canvas: { positions: {} },
    createdAt: '2026-10-01T09:00:00.000Z',
    lastWorkedAt: '2026-11-01T09:00:00.000Z',
  }

  it('zápisník (i s nadpisy) je tělo, plátno a historie chatu se nezapisují', () => {
    const text = projectToMarkdown(project)
    expect(text).toContain('\n# E-shop redesign\n\n# Schůzka 1\n')
    expect(text).not.toContain('notebookHistory')
    expect(text).not.toContain('canvas')
    const result = markdownToProject(text)
    const { notebookHistory: _h, canvas: _c, ...expected } = project
    expect(result.project).toEqual(expected)
  })

  it('název mimo H1 a zápisník začínající nadpisem se načtou správně', () => {
    const p = { ...project, name: ' Mezera ', notebook: '# Nadpis zápisníku' }
    const result = markdownToProject(projectToMarkdown(p))
    expect(result.project.name).toBe(' Mezera ')
    expect(result.project.notebook).toBe('# Nadpis zápisníku')
  })

  it('zápisník s CRLF zůstane ve frontmatteru', () => {
    const p = { ...project, notebook: 'a\r\nb' }
    expect(markdownToProject(projectToMarkdown(p)).project.notebook).toBe('a\r\nb')
  })

  it('ručně napsaný project.md bez id dostane výchozí hodnoty a varování', () => {
    const result = markdownToProject('# Nový projekt\n\nPoznámka')
    expect(result.project).toMatchObject({ name: 'Nový projekt', notebook: 'Poznámka', phase: 'research' })
    expect(result.project.notebookHistory).toBeUndefined()
    expect(result.warnings).toEqual([{ code: 'missingId' }])
  })
})

describe('souvislosti', () => {
  const connections = [
    { id: 'c1', projectId: 'p1', entityType1: 'personas', entityId1: 'a', entityType2: 'goals', entityId2: 'b', note: 'pozn: x', createdAt: '2026-01-01' },
  ]

  it('převod tam a zpět bez projectId, s komentáři u odkazů', () => {
    const text = connectionsToYaml(connections, { refLabel: (id) => (id === 'a' ? 'PER-001 Anna' : null) })
    expect(text).toContain('entityId1: a # PER-001 Anna')
    expect(text).not.toContain('projectId')
    const result = yamlToConnections(text)
    expect(result.connections).toEqual([withoutProjectId(connections[0])])
  })

  it('neplatné položky vynechá s varováním a přijme i holý seznam', () => {
    const result = yamlToConnections('- entityType1: personas\n  entityId1: a\n- jen text\n')
    expect(result.connections).toEqual([])
    expect(result.warnings).toContainEqual({ code: 'invalidConnection', index: 0 })
    expect(result.warnings).toContainEqual({ code: 'invalidConnection', index: 1 })
  })

  it('chyba syntaxe a prázdný soubor', () => {
    expect(yamlToConnections('connections: [').ok).toBe(false)
    expect(yamlToConnections('')).toEqual({ ok: true, connections: [], warnings: [] })
  })
})
