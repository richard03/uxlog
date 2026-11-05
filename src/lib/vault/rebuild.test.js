import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import { buildVaultFiles, parseVaultFiles } from './workspace.js'
import { createHeadingResolver } from './format.js'
import { getEntityDefaults, ENTITY_CONFIG } from '../dataConfig.js'
import { getEmptyData } from '../storage.js'
import {
  SYNC_ACTION, decideVaultSync, parseVaultSync, vaultHasProjects, stateHasData, forgetProjectPaths,
  buildRebuiltState, countRecordChanges, cacheSyncIdFor, serializeVaultSync,
} from './rebuild.js'

const headingFor = createHeadingResolver(cs)

function sampleData() {
  const data = getEmptyData()
  data.projects = [
    { id: 'p1', ...getEntityDefaults('project'), name: 'Alfa', createdAt: '2026-01-01', canvas: { positions: {} }, notebookHistory: [{ id: 'm1', text: 'x' }] },
    { id: 'p2', ...getEntityDefaults('project'), name: 'Beta', createdAt: '2026-01-02' },
  ]
  data.personas = [
    { id: 'per1', projectId: 'p1', ...getEntityDefaults('persona'), code: 'PER-001', name: 'Anna', createdAt: '2026-01-03' },
    { id: 'per2', projectId: 'p1', ...getEntityDefaults('persona'), code: 'PER-002', name: 'Boris', createdAt: '2026-01-03' },
  ]
  data.goals = [{ id: 'g1', projectId: 'p2', ...getEntityDefaults('goal'), code: 'CIL-001', name: 'Cíl', createdAt: '2026-01-03' }]
  data.connections = [
    { id: 'c1', projectId: 'p1', entityType1: 'personas', entityId1: 'per1', entityType2: 'personas', entityId2: 'per2', note: '', createdAt: '2026-01-04' },
  ]
  return data
}

/** Soubory složky ze stavu (volitelně upravené) a jejich načtení. */
function vaultOf(data, edit = (files) => files) {
  const files = edit(buildVaultFiles(data, { headingFor }).files)
  return parseVaultFiles(files, { headingFor })
}

const rebuild = (current, parsed, ids = ['n1', 'n2', 'n3']) => buildRebuiltState({
  current,
  parsed,
  currentIndex: buildVaultFiles(current, { headingFor }).index,
  generateId: () => ids.shift(),
  entityConfig: ENTITY_CONFIG,
})

describe('decideVaultSync', () => {
  const base = { manifestSyncId: 's1', manifestHasFiles: true, hasProjects: true, hasData: true }

  it('shodná značka = v souladu', () => {
    expect(decideVaultSync({ ...base, cacheSyncId: 's1' })).toBe(SYNC_ACTION.IN_SYNC)
  })

  it('jiná nebo chybějící značka = obnova ze složky', () => {
    expect(decideVaultSync({ ...base, cacheSyncId: 's0' })).toBe(SYNC_ACTION.REBUILD)
    expect(decideVaultSync({ ...base, cacheSyncId: null })).toBe(SYNC_ACTION.REBUILD)
    expect(decideVaultSync({ ...base, manifestSyncId: null, cacheSyncId: 's1' })).toBe(SYNC_ACTION.REBUILD)
  })

  it('prázdná databáze a složka se staršími soubory bez značky = obnova', () => {
    expect(decideVaultSync({ ...base, manifestSyncId: null, cacheSyncId: null, hasData: false })).toBe(SYNC_ACTION.REBUILD)
    expect(decideVaultSync({ ...base, manifestSyncId: null, manifestHasFiles: false, cacheSyncId: null })).toBe(SYNC_ACTION.REBUILD)
  })

  it('starší instalace bez značek s daty = pokračovat jako dřív', () => {
    expect(decideVaultSync({ ...base, manifestSyncId: null, cacheSyncId: null })).toBe(SYNC_ACTION.LEGACY)
  })

  it('složka bez projektů = zapsat do ní data aplikace', () => {
    expect(decideVaultSync({ ...base, hasProjects: false, cacheSyncId: null })).toBe(SYNC_ACTION.SEED)
  })

  it('zvládne neplatný vstup', () => {
    expect(decideVaultSync(undefined)).toBe(SYNC_ACTION.SEED)
  })
})

describe('pomocné funkce', () => {
  it('značky po složkách: čtení (i starší podoby), zápis a hledání podle složky', () => {
    expect(parseVaultSync('{"root":"C:\\\\D","syncId":"s"}')).toEqual({ 'c:/d': 's' })
    expect(parseVaultSync('{nejson')).toEqual({})
    expect(parseVaultSync(null)).toEqual({})
    expect(parseVaultSync('{"roots":{"c:/a":"x","c:/b":""}}')).toEqual({ 'c:/a': 'x' })
    const marks = parseVaultSync(serializeVaultSync({ 'c:/a': 'x' }, 'D:\\Repo\\', 'y'))
    expect(marks).toEqual({ 'c:/a': 'x', 'd:/repo': 'y' })
    expect(cacheSyncIdFor(marks, 'd:/REPO')).toBe('y')
    expect(cacheSyncIdFor(marks, 'E:\\')).toBeNull()
  })

  it('vaultHasProjects hledá project.md jen přímo ve složce projektu', () => {
    expect(vaultHasProjects([{ path: 'projects/A/project.md' }])).toBe(true)
    expect(vaultHasProjects([{ path: 'projects/A/goals/project.md' }, { path: '.uxlog/manifest.json' }])).toBe(false)
    expect(vaultHasProjects(null)).toBe(false)
  })

  it('stateHasData', () => {
    expect(stateHasData(sampleData())).toBe(true)
    expect(stateHasData(getEmptyData())).toBe(false)
    expect(stateHasData(null)).toBe(false)
  })

  it('forgetProjectPaths vypustí jen soubory projektů', () => {
    expect(forgetProjectPaths({ 'projects/A/project.md': 'h', '.uxlog/claude/RULES.md': 'r' })).toEqual({ '.uxlog/claude/RULES.md': 'r' })
    expect(forgetProjectPaths(null)).toEqual({})
  })
})

describe('buildRebuiltState', () => {
  it('ze shodné složky sestaví stejný stav', () => {
    const current = sampleData()
    const { data, generatedIds, keptPaths } = rebuild(current, vaultOf(current))
    expect(data).toEqual(current)
    expect(generatedIds).toBe(0)
    expect(keptPaths).toEqual([])
    expect(countRecordChanges(current, data)).toBe(0)
  })

  it('prázdnou databázi sestaví celou ze složky', () => {
    const source = sampleData()
    const { data } = rebuild(getEmptyData(), vaultOf(source))
    expect(countRecordChanges(source, data)).toBe(0)
    expect(data.projects[0].notebookHistory).toEqual(source.projects[0].notebookHistory)
  })

  it('složka vyhrává: změny, smazání i nové záznamy', () => {
    const current = sampleData()
    const other = sampleData()
    other.personas[0].name = 'Anna Nová'
    other.personas.splice(1, 1)
    other.connections = []
    other.goals.push({ id: 'g2', projectId: 'p2', ...getEntityDefaults('goal'), code: 'CIL-002', name: 'Druhý', createdAt: '2026-01-05' })
    const { data } = rebuild(current, vaultOf(other))
    expect(data.personas.map((p) => p.name)).toEqual(['Anna Nová'])
    expect(data.goals.map((g) => g.id)).toEqual(['g1', 'g2'])
    expect(data.connections).toEqual([])
    expect(countRecordChanges(current, data)).toBe(4)
  })

  it('soubor s chybou nesmaže záznam – zůstane verze z databáze', () => {
    const current = sampleData()
    const parsed = vaultOf(current, (files) => files.map((f) => (f.path.includes('/personas/PER-002') ? { ...f, content: '---\nid: [rozbité\n---\n' } : f)))
    expect(parsed.errors.length).toBeGreaterThan(0)
    const { data, keptPaths } = rebuild(current, parsed)
    expect(data.personas.map((p) => p.id)).toEqual(['per1', 'per2'])
    expect(keptPaths).toHaveLength(1)
  })

  it('rozbitý project.md ponechá celý projekt z databáze', () => {
    const current = sampleData()
    const parsed = vaultOf(current, (files) => files.map((f) => (f.path === 'projects/Beta/project.md' ? { ...f, content: '---\n: :\n---' } : f)))
    const { data, keptPaths } = rebuild(current, parsed)
    expect(data.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(data.goals.map((g) => g.id)).toEqual(['g1'])
    expect(keptPaths).toEqual(['projects/Beta/project.md'])
  })

  it('ručně založenému záznamu doplní id a kód, projekt podle složky', () => {
    const current = sampleData()
    const parsed = vaultOf(current, (files) => [...files, { path: 'projects/Alfa/personas/nova.md', content: '---\nname: Cyril\n---\n' }])
    const { data, generatedIds } = rebuild(current, parsed)
    const cyril = data.personas.find((p) => p.name === 'Cyril')
    expect(cyril).toMatchObject({ id: 'n1', projectId: 'p1', code: 'PER-003' })
    expect(generatedIds).toBe(1)
  })

  it('plátno a historii chatu, které ve složce chybí, ponechá z databáze', () => {
    const current = sampleData()
    const parsed = vaultOf(current, (files) => files.filter((f) => !f.path.startsWith('.uxlog/')))
    const { data } = rebuild(current, parsed)
    expect(data.projects[0].canvas).toEqual(current.projects[0].canvas)
    expect(data.projects[0].notebookHistory).toEqual(current.projects[0].notebookHistory)
  })

  it('zachová pořadí záznamů z databáze', () => {
    const current = sampleData()
    current.personas.reverse()
    const { data } = rebuild(current, vaultOf(current))
    expect(data.personas.map((p) => p.id)).toEqual(['per2', 'per1'])
  })

  it('obnoví jen projekty složky; ostatní projekty a jejich kopie ve složce nechá být', () => {
    const current = sampleData()
    const other = sampleData()
    other.personas[0].name = 'Ze složky'
    other.goals[0].name = 'Kopie projektu Beta (patří jinam)'
    const parsed = vaultOf(other)
    const { data } = buildRebuiltState({
      current,
      parsed,
      currentIndex: buildVaultFiles({ ...current, projects: [current.projects[0]] }, { headingFor }).index,
      scopeProjectIds: ['p1'],
      generateId: () => 'n',
      entityConfig: ENTITY_CONFIG,
    })
    expect(data.personas[0].name).toBe('Ze složky')
    expect(data.goals).toEqual(current.goals)
    expect(data.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('projekt mimo složku zůstane, i když ve složce chybí', () => {
    const current = sampleData()
    const onlyAlfa = { ...sampleData(), projects: [sampleData().projects[0]], goals: [] }
    const { data } = buildRebuiltState({ current, parsed: vaultOf(onlyAlfa), scopeProjectIds: ['p1'], generateId: () => 'n' })
    expect(data.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(data.goals.map((g) => g.id)).toEqual(['g1'])
  })

  it('zvládne neplatný vstup', () => {
    const { data } = buildRebuiltState({ parsed: null, generateId: () => 'x' })
    expect(data.projects).toEqual([])
    expect(countRecordChanges(null, undefined)).toBe(0)
  })
})
