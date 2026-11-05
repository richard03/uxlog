import { describe, it, expect } from 'vitest'
import cs from '../../i18n/cs.js'
import { buildVaultImport, diffRecord, findNewFiles, NEW_FILE } from './importChanges.js'
import { buildVaultFiles } from './workspace.js'
import { createHeadingResolver } from './format.js'
import { CONFLICT } from './sync.js'
import { getEntityDefaults } from '../dataConfig.js'
import { getEmptyData } from '../storage.js'

const headingFor = createHeadingResolver(cs)

function sampleState() {
  const data = getEmptyData()
  data.projects = [{ id: 'p1', ...getEntityDefaults('project'), name: 'E-shop', createdAt: '2026-01-01' }]
  data.personas = [{ id: 'per1', projectId: 'p1', ...getEntityDefaults('persona'), code: 'PER-001', name: 'Anna', motivation: 'Čas', createdAt: '2026-01-02' }]
  data.scenarios = [{ id: 'scn1', projectId: 'p1', ...getEntityDefaults('scenario'), code: 'SCN-001', name: 'Nákup', createdAt: '2026-01-02' }]
  data.connections = [{ id: 'c1', projectId: 'p1', entityType1: 'personas', entityId1: 'per1', entityType2: 'scenarios', entityId2: 'scn1', note: '', createdAt: '2026-01-03' }]
  return data
}

/** Vault zapsaný aplikací + úpravy souborů (cesta → obsah, null = smazat). */
function setup(edits = {}, state = sampleState()) {
  const { files, index } = buildVaultFiles(state, { headingFor })
  const map = new Map(files.map((f) => [f.path, f.content]))
  for (const [path, content] of Object.entries(edits)) {
    if (content === null) map.delete(path)
    else map.set(path, typeof content === 'function' ? content(map.get(path)) : content)
  }
  return { state, index, files: [...map.entries()].map(([path, content]) => ({ path, content })) }
}

let n = 0
function run({ state, index, files }, changed) {
  return buildVaultImport({
    files, changed, desiredIndex: index, state, headingFor, generateId: () => `gen-${++n}`, now: '2026-11-04T10:00:00.000Z',
  })
}

const PERSONA = 'projects/E-shop/personas/PER-001-anna.md'

describe('buildVaultImport', () => {
  it('úprava textu a hodnoty v souboru → update jen se změněnými poli', () => {
    const ctx = setup({ [PERSONA]: (c) => c.replace('Čas', 'Rychlost').replace('status: protopersona', 'status: persona') })
    const { changes, invalid, unchanged } = run(ctx, [{ path: PERSONA, reason: CONFLICT.MODIFIED }])
    expect(invalid).toEqual([])
    expect(unchanged).toEqual([])
    expect(changes).toEqual([expect.objectContaining({
      kind: 'update', collection: 'personas', entityId: 'per1', projectId: 'p1', label: 'PER-001 Anna',
      patch: { status: 'persona', motivation: 'Rychlost' },
    })])
    expect(changes[0].fields).toEqual([
      { field: 'status', before: 'protopersona', after: 'persona' },
      { field: 'motivation', before: 'Čas', after: 'Rychlost' },
    ])
  })

  it('jen přeformátovaný soubor (bez věcné změny) → unchanged', () => {
    const ctx = setup({ [PERSONA]: (c) => `${c}\n\n` })
    const { changes, unchanged } = run(ctx, [{ path: PERSONA, reason: CONFLICT.MODIFIED }])
    expect(changes).toEqual([])
    expect(unchanged).toEqual([PERSONA])
  })

  it('nový soubor bez id → create s novým id, dalším kódem a projektem ze složky', () => {
    const path = 'projects/E-shop/personas/nova.md'
    const ctx = setup({ [path]: '# Petr\n\n## Motivace\n\nCena\n' })
    const { changes } = run(ctx, [{ path, reason: NEW_FILE }])
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: 'create', collection: 'personas', projectId: 'p1', label: 'PER-002 Petr' })
    expect(changes[0].record).toMatchObject({
      id: expect.stringMatching(/^gen-/), code: 'PER-002', name: 'Petr', motivation: 'Cena', projectId: 'p1',
      status: 'protopersona', createdAt: '2026-11-04T10:00:00.000Z',
    })
  })

  it('dva nové soubory stejného typu dostanou různé kódy', () => {
    const ctx = setup({ 'projects/E-shop/scenarios/a.md': '# A\n', 'projects/E-shop/scenarios/b.md': '# B\n' })
    const { changes } = run(ctx, [{ path: 'projects/E-shop/scenarios/a.md', reason: NEW_FILE }, { path: 'projects/E-shop/scenarios/b.md', reason: NEW_FILE }])
    expect(changes.map((c) => c.record.code)).toEqual(['SCN-002', 'SCN-003'])
  })

  it('smazaný soubor → delete; smazaný project.md → nepodporováno', () => {
    const ctx = setup({ [PERSONA]: null })
    const { changes } = run(ctx, [{ path: PERSONA, reason: CONFLICT.DELETED }, { path: 'projects/E-shop/project.md', reason: CONFLICT.DELETED }])
    expect(changes.map((c) => [c.kind, c.entityId])).toEqual([['delete', 'per1'], ['unsupported', 'p1']])
  })

  it('soubor s chybou → invalid s problémy, nic se nemění', () => {
    const ctx = setup({ [PERSONA]: '---\nid: [\n---\n' })
    const { changes, invalid } = run(ctx, [{ path: PERSONA, reason: CONFLICT.MODIFIED }])
    expect(changes).toEqual([])
    expect(invalid[0]).toMatchObject({ path: PERSONA, issues: [expect.objectContaining({ code: 'yamlSyntax' })] })
  })

  it('soubor na neznámém místě → invalid', () => {
    const path = 'projects/E-shop/poznamky/x.md'
    const { invalid } = run(setup({ [path]: '# x' }), [{ path, reason: NEW_FILE }])
    expect(invalid).toEqual([{ path, issues: [expect.objectContaining({ code: 'unknownFile' })] }])
  })

  it('změna souvislostí → přidané, odebrané a nový seznam', () => {
    const path = 'projects/E-shop/connections.yaml'
    const ctx = setup({ [path]: 'connections:\n  - entityType1: personas\n    entityId1: per1\n    entityType2: scenarios\n    entityId2: scn1\n    note: nová\n' })
    const { changes } = run(ctx, [{ path, reason: CONFLICT.MODIFIED }])
    expect(changes[0]).toMatchObject({ kind: 'connections', projectId: 'p1' })
    expect(changes[0].removed.map((c) => c.id)).toEqual(['c1'])
    expect(changes[0].added).toEqual([expect.objectContaining({ note: 'nová', projectId: 'p1', id: expect.stringMatching(/^gen-/) })])
  })

  it('přesun souboru do jiného projektu → změna projectId', () => {
    const state = sampleState()
    state.projects.push({ id: 'p2', ...getEntityDefaults('project'), name: 'Jiný', createdAt: '2026-02-01' })
    const target = 'projects/Jiný/personas/PER-001-anna.md'
    const ctx = setup({ [target]: (_) => undefined }, state)
    const original = ctx.files.find((f) => f.path === PERSONA).content
    ctx.files = ctx.files.filter((f) => f.path !== PERSONA && f.path !== target).concat([{ path: target, content: original }])
    const { changes, unchanged } = run(ctx, [{ path: target, reason: NEW_FILE }, { path: PERSONA, reason: CONFLICT.DELETED }])
    expect(changes).toEqual([expect.objectContaining({ kind: 'update', entityId: 'per1', patch: { projectId: 'p2' } })])
    // původní cesta už neexistuje, ale záznam se nemaže – jen se přijme
    expect(unchanged).toEqual([PERSONA])
  })

  it('nový projekt bez id a jeho záznam', () => {
    const ctx = setup({ 'projects/Nový/project.md': '# Nový\n', 'projects/Nový/goals/cil.md': '# Cíl\n' })
    const { changes } = run(ctx, [{ path: 'projects/Nový/project.md', reason: NEW_FILE }, { path: 'projects/Nový/goals/cil.md', reason: NEW_FILE }])
    const project = changes.find((c) => c.collection === 'projects')
    const goal = changes.find((c) => c.collection === 'goals')
    expect(project.record.id).toMatch(/^gen-/)
    expect(goal.projectId).toBe(project.record.id)
    expect(goal.record.code).toBe('GOL-001')
  })

  it('úprava project.md → update projektu bez plátna a historie chatu', () => {
    const state = sampleState()
    state.projects[0].canvas = { positions: {} }
    state.projects[0].notebookHistory = [{ role: 'user' }]
    const ctx = setup({ 'projects/E-shop/project.md': (c) => c.replace('phase: research', 'phase: design') }, state)
    const { changes } = run(ctx, [{ path: 'projects/E-shop/project.md', reason: CONFLICT.MODIFIED }])
    expect(changes).toEqual([expect.objectContaining({ kind: 'update', collection: 'projects', patch: { phase: 'design' } })])
  })

  it('se základem: pole změněné v aplikaci i v souboru je konflikt, ostatní se sloučí', () => {
    const ctx = setup({ [PERSONA]: (c) => c.replace('Čas', 'Ze souboru').replace('status: protopersona', 'status: persona') })
    const base = { 'personas:per1': { ...ctx.state.personas[0] } }
    ctx.state.personas[0] = { ...ctx.state.personas[0], motivation: 'Z aplikace', needs: 'Jen v aplikaci' }
    const { changes } = buildVaultImport({
      files: ctx.files, changed: [{ path: PERSONA, reason: CONFLICT.MODIFIED }], desiredIndex: ctx.index, state: ctx.state,
      base, headingFor, generateId: () => 'x', now: 'now',
    })
    expect(changes).toHaveLength(1)
    expect(changes[0].patch).toEqual({ status: 'persona' })
    expect(changes[0].conflicts).toEqual([{ field: 'motivation', base: 'Čas', app: 'Z aplikace', file: 'Ze souboru' }])
  })

  it('se základem: změna jen v aplikaci (soubor = základ) není změna k načtení', () => {
    const ctx = setup()
    const base = { 'personas:per1': { ...ctx.state.personas[0] } }
    ctx.state.personas[0] = { ...ctx.state.personas[0], motivation: 'Nové v aplikaci' }
    const { changes, unchanged } = buildVaultImport({
      files: ctx.files, changed: [{ path: PERSONA, reason: CONFLICT.MODIFIED }], desiredIndex: ctx.index, state: ctx.state,
      base, headingFor, generateId: () => 'x', now: 'now',
    })
    expect(changes).toEqual([])
    expect(unchanged).toEqual([PERSONA])
  })

  it('změny mimo projects/ ignoruje', () => {
    const { changes, invalid, unchanged } = run(setup(), [{ path: '.claude/settings.json', reason: CONFLICT.MODIFIED }])
    expect([changes, invalid, unchanged]).toEqual([[], [], []])
  })
})

describe('diffRecord', () => {
  it('chybějící pole v současném záznamu porovná s výchozí hodnotou', () => {
    expect(diffRecord({ id: 'x' }, { id: 'x', name: '', status: 'protopersona' }, getEntityDefaults('persona'))).toEqual([])
  })

  it('odebrané extraSections jsou změna na undefined', () => {
    expect(diffRecord({ extraSections: [{ heading: 'A', content: 'b' }] }, {})).toEqual([
      { field: 'extraSections', before: [{ heading: 'A', content: 'b' }], after: undefined },
    ])
  })

  it('ignoruje časová razítka a pořadí klíčů', () => {
    expect(diffRecord({ a: { x: 1, y: 2 }, updatedAt: '1' }, { a: { y: 2, x: 1 }, updatedAt: '2' })).toEqual([])
  })
})

describe('findNewFiles', () => {
  it('najde datové soubory, které aplikace nezapsala ani nechce zapsat', () => {
    const disk = [
      { path: 'projects/A/personas/nova.md' }, { path: 'projects/A/personas/known.md' },
      { path: 'projects/A/personas/desired.md' }, { path: 'projects/A/INDEX.md' }, { path: '.claude/x.json' },
    ]
    expect(findNewFiles(disk, { 'projects/A/personas/known.md': 'h' }, ['projects/A/personas/desired.md'])).toEqual(['projects/A/personas/nova.md'])
  })
})
