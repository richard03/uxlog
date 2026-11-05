import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import { buildVaultFiles, parseVaultFiles, buildProjectIndex } from './workspace.js'
import { createHeadingResolver, VAULT_FORMAT_VERSION } from './format.js'
import { VAULT_COLLECTIONS } from './paths.js'
import { getEntityDefaults } from '../dataConfig.js'
import { getEmptyData } from '../storage.js'

const headingFor = createHeadingResolver(cs)

function project(id, name, createdAt) {
  return { id, ...getEntityDefaults('project'), name, createdAt, lastWorkedAt: createdAt, notebook: `Zápisník ${id}` }
}

function sampleData() {
  const data = getEmptyData()
  const p1 = { ...project('p1', 'E-shop: redesign', '2026-01-01'), canvas: { positions: { 'personas:per1': { x: 10, y: 20 } }, viewport: { x: 0, y: 0, zoom: 1 } } }
  data.projects = [p1, project('p2', 'E-shop: redesign', '2026-02-01')]
  for (const { collection, entityType } of VAULT_COLLECTIONS) {
    for (const p of data.projects) {
      data[collection].push({
        id: `${collection}-${p.id}`, projectId: p.id, ...getEntityDefaults(entityType),
        name: `Položka ${collection}`, createdAt: '2026-03-01',
      })
    }
  }
  data.personas[0].scenarioIds = ['scenarios-p1']
  data.personas[0].code = 'PER-001'
  data.connections = [
    { id: 'c1', projectId: 'p1', entityType1: 'personas', entityId1: 'personas-p1', entityType2: 'goals', entityId2: 'goals-p1', note: '', createdAt: '2026-03-02' },
  ]
  return data
}

describe('buildVaultFiles', () => {
  it('vytvoří složku pro každý projekt podle názvu a soubory entit v podsložkách', () => {
    const { files, warnings } = buildVaultFiles(sampleData(), { headingFor, appVersion: '1.2.3' })
    const paths = files.map((f) => f.path)
    expect(paths).toContain('.uxlog/workspace.yaml')
    expect(paths).toContain('projects/E-shop- redesign/project.md')
    expect(paths).toContain('projects/E-shop- redesign (2)/project.md')
    expect(paths).toContain('projects/E-shop- redesign/personas/PER-001-polozka-personas.md')
    expect(paths).toContain('projects/E-shop- redesign/team/polozka-teammembers.md')
    expect(paths).toContain('projects/E-shop- redesign/connections.yaml')
    expect(paths).not.toContain('projects/E-shop- redesign (2)/connections.yaml')
    expect(paths).toContain('.uxlog/canvas/p1.yaml')
    expect(new Set(paths).size).toBe(paths.length)
    expect(warnings).toEqual([])
    expect(files.find((f) => f.path === '.uxlog/workspace.yaml').content).toContain(`formatVersion: ${VAULT_FORMAT_VERSION}`)
  })

  it('odkazy doplní komentářem s kódem a názvem', () => {
    const data = sampleData()
    data.scenarios[0].code = 'SCN-001'
    const { files } = buildVaultFiles(data, { headingFor })
    const persona = files.find((f) => f.path.endsWith('personas/PER-001-polozka-personas.md'))
    expect(persona.content).toContain('- scenarios-p1 # SCN-001 Položka scenarios')
  })

  it('sirotky nezapíše a nahlásí je', () => {
    const data = sampleData()
    data.goals.push({ id: 'g-orphan', projectId: 'neexistuje', name: 'Sirotek' })
    const { files, warnings } = buildVaultFiles(data)
    expect(files.some((f) => f.content.includes('g-orphan'))).toBe(false)
    expect(warnings).toEqual([{ code: 'orphanEntities', collection: 'goals', count: 1 }])
  })

  it('zvládne prázdná a poškozená data', () => {
    expect(buildVaultFiles(null).files.map((f) => f.path)).toEqual(['.uxlog/workspace.yaml'])
    expect(buildVaultFiles({ projects: [null, { name: 'bez id' }], goals: 'x' }).files).toHaveLength(1)
  })
})

describe('parseVaultFiles', () => {
  it('převod celého stavu tam a zpět je bezeztrátový (historie chatu v .uxlog/notebook)', () => {
    const data = sampleData()
    data.projects[0].notebookHistory = [{ id: 'm1', mode: 'process', text: 'poznámka', outcomes: [] }]
    data.projects[0].config = { entityCustomFields: { persona: [{ id: 'f1', label: 'Věk', type: 'text' }] } }
    const { files } = buildVaultFiles(data, { headingFor })
    const result = parseVaultFiles(files, { headingFor })
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.formatVersion).toBe(VAULT_FORMAT_VERSION)

    expect(files.some((f) => f.path.startsWith('.uxlog/notebook/'))).toBe(true)
    expect(files.some((f) => f.path === '.uxlog/config/p1.yaml')).toBe(true)
    const sortById = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1))
    // prázdná historie chatu se nezapisuje (výchozí hodnota)
    const withoutEmptyHistory = ({ notebookHistory, ...rest }) => (notebookHistory?.length ? { ...rest, notebookHistory } : rest)
    expect(sortById(result.data.projects)).toEqual(sortById(data.projects.map(withoutEmptyHistory)))
    for (const key of [...VAULT_COLLECTIONS.map((c) => c.collection), 'connections']) {
      expect(sortById(result.data[key])).toEqual(sortById(data[key]))
    }
  })

  it('vrátí index cest k entitám', () => {
    const { files } = buildVaultFiles(sampleData(), { headingFor })
    const { index } = parseVaultFiles(files, { headingFor })
    expect(index).toContainEqual({
      path: 'projects/E-shop- redesign/personas/PER-001-polozka-personas.md',
      collection: 'personas', id: 'personas-p1', projectFolder: 'E-shop- redesign',
    })
  })

  it('nový soubor bez id napsaný ručně přiřadí projektu ze složky', () => {
    const files = [
      { path: 'projects\\Nový\\project.md', content: '---\nid: p9\n---\n# Nový\n' },
      { path: 'projects/Nový/personas/nova.md', content: '# Nová persona\n\n## Motivace\n\nRychlost\n' },
    ]
    const result = parseVaultFiles(files, { headingFor })
    expect(result.errors).toEqual([])
    expect(result.data.personas).toEqual([
      { ...getEntityDefaults('persona'), name: 'Nová persona', motivation: 'Rychlost', projectId: 'p9' },
    ])
    expect(result.warnings).toEqual([{ path: 'projects/Nový/personas/nova.md', code: 'missingId' }])
  })

  it('rozbitý soubor přeskočí s chybou a ostatní načte', () => {
    const files = [
      { path: 'projects/A/project.md', content: '---\nid: p1\n---\n# A\n' },
      { path: 'projects/A/goals/ok.md', content: '---\nid: g1\n---\n# OK\n' },
      { path: 'projects/A/goals/broken.md', content: '---\nid: [\n---\n# Rozbitý\n' },
    ]
    const result = parseVaultFiles(files)
    expect(result.data.goals.map((g) => g.id)).toEqual(['g1'])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ path: 'projects/A/goals/broken.md', code: 'yamlSyntax' })
  })

  it('duplicitní id nahlásí a načte jen první soubor', () => {
    const files = [
      { path: 'projects/A/project.md', content: '---\nid: p1\n---\n# A\n' },
      { path: 'projects/A/goals/a.md', content: '---\nid: g1\n---\n# První\n' },
      { path: 'projects/A/goals/b.md', content: '---\nid: g1\n---\n# Kopie\n' },
    ]
    const result = parseVaultFiles(files)
    expect(result.data.goals.map((g) => g.name)).toEqual(['První'])
    expect(result.errors).toEqual([{
      path: 'projects/A/goals/b.md', code: 'duplicateId', collection: 'goals', id: 'g1', firstPath: 'projects/A/goals/a.md',
    }])
  })

  it('složka bez project.md je chyba a její entity se nenačtou', () => {
    const result = parseVaultFiles([{ path: 'projects/B/goals/x.md', content: '---\nid: g\n---\n' }])
    expect(result.data.goals).toEqual([])
    expect(result.errors).toEqual([{ path: 'projects/B/project.md', code: 'missingProjectFile' }])
  })

  it('neznámé soubory ignoruje s varováním, skryté soubory a složky tiše', () => {
    const result = parseVaultFiles([
      { path: 'projects/A/project.md', content: '---\nid: p1\n---\n# A\n' },
      { path: 'projects/A/neznama/x.md', content: '' },
      { path: 'projects/A/goals/obrazek.png', content: '' },
      { path: 'projects/A/goals/.DS_Store', content: '' },
      { path: 'README.md', content: '' },
      { path: '.claude/skills/x/SKILL.md', content: '' },
    ])
    expect(result.warnings.map((w) => w.path)).toEqual([
      'README.md', 'projects/A/goals/obrazek.png', 'projects/A/neznama/x.md',
    ])
  })

  it('upozorní na novější verzi formátu', () => {
    const result = parseVaultFiles([{ path: '.uxlog/workspace.yaml', content: 'formatVersion: 99\n' }])
    expect(result.warnings).toContainEqual({ path: '.uxlog/workspace.yaml', code: 'newerFormatVersion', formatVersion: 99 })
  })

  it('zvládne neplatný vstup', () => {
    expect(parseVaultFiles(null).data).toEqual(getEmptyData())
    expect(parseVaultFiles([null, { path: 1 }]).errors).toEqual([])
  })
})

describe('INDEX.md', () => {
  it('rejstřík projektu obsahuje tabulku záznamů a při čtení se ignoruje', () => {
    const { files } = buildVaultFiles(sampleData(), { headingFor, indexLabels: { columns: ['Kód', 'Název', 'Soubor', 'id'], note: 'Generováno.' } })
    const indexFile = files.find((f) => f.path === 'projects/E-shop- redesign/INDEX.md')
    expect(indexFile.content).toContain('# E-shop: redesign\n\nGenerováno.')
    expect(indexFile.content).toContain('| PER-001 | Položka personas | personas/PER-001-polozka-personas.md | personas-p1 |')
    const result = parseVaultFiles(files, { headingFor })
    expect(result.warnings).toEqual([])
  })

  it('svislítko v názvu se v tabulce escapuje', () => {
    const text = buildProjectIndex({ name: 'P' }, [{ dir: 'goals', rows: [{ code: '', name: 'A | B', file: 'a.md', id: '1' }] }])
    expect(text).toContain(String.raw`| A \| B |`)
  })
})

describe('vlastní složka projektu (layout project)', () => {
  it('projekt dostane pevnou logickou složku a workspace nese rozložení', () => {
    const data = sampleData()
    data.projects = [data.projects[0]]
    const { files, index } = buildVaultFiles(data, { headingFor, layout: 'project' })
    expect(files.find((f) => f.path === '.uxlog/workspace.yaml').content).toContain('layout: project')
    expect(files.some((f) => f.path === 'projects/__project__/project.md')).toBe(true)
    expect(Object.keys(index).every((p) => p.startsWith('projects/__project__/'))).toBe(true)
    const result = parseVaultFiles(files, { headingFor })
    expect(result.errors).toEqual([])
    expect(result.data.projects.map((p) => p.id)).toEqual(['p1'])
  })

  it('výchozí složka layout nezapisuje', () => {
    const { files } = buildVaultFiles(sampleData(), { headingFor })
    expect(files.find((f) => f.path === '.uxlog/workspace.yaml').content).not.toContain('layout')
  })
})
