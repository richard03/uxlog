import { describe, it, expect } from 'vitest'
import {
  changedFields, diffStates, mergeChanges, groupChangesByProject, changeAction,
  appendHistoryEntry, normalizeHistory, buildRevertPatch, getDeletedProjects, pruneHistory,
  describeHistoryEntry, recordLabel,
} from './history.js'

const COLLECTIONS = ['projects', 'personas', 'connections']

function data(overrides = {}) {
  return { projects: [{ id: 'p1', name: 'Projekt' }], personas: [], connections: [], ...overrides }
}

describe('changedFields', () => {
  it('ignoruje automaticky měněná pole', () => {
    expect(changedFields({ name: 'A', updatedAt: '1' }, { name: 'A', updatedAt: '2', lastWorkedAt: 'x' })).toEqual([])
  })
  it('vrací změněná, přidaná i odebraná pole', () => {
    expect(changedFields({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }).sort()).toEqual(['b', 'c'])
    expect(changedFields({ a: 1, d: [1] }, { a: 1 })).toEqual(['d'])
  })
  it('snese null', () => {
    expect(changedFields(null, { a: 1 })).toEqual(['a'])
  })
})

describe('diffStates', () => {
  it('najde vytvořené, upravené a smazané záznamy', () => {
    const prev = data({ personas: [{ id: 'a', projectId: 'p1', name: 'A' }, { id: 'b', projectId: 'p1', name: 'B' }] })
    const next = data({ personas: [{ id: 'a', projectId: 'p1', name: 'A2' }, { id: 'c', projectId: 'p1', name: 'C' }] })
    const changes = diffStates(prev, next, COLLECTIONS)
    expect(changes.map((c) => [c.id, changeAction(c)])).toEqual([['a', 'update'], ['c', 'create'], ['b', 'delete']])
  })
  it('nezapočítá změnu jen v updatedAt / notebookHistory', () => {
    const prev = data()
    const next = data({ projects: [{ id: 'p1', name: 'Projekt', updatedAt: 'x', notebookHistory: [{ id: 'n' }] }] })
    expect(diffStates(prev, next, COLLECTIONS)).toEqual([])
  })
  it('snese chybějící kolekce a záznamy bez id', () => {
    expect(diffStates({}, { personas: [null, { name: 'bez id' }] }, COLLECTIONS)).toEqual([])
  })
  it('ukládá kopie, ne reference', () => {
    const rec = { id: 'a', projectId: 'p1', name: 'A' }
    const [change] = diffStates(data(), data({ personas: [rec] }), COLLECTIONS)
    rec.name = 'změněno'
    expect(change.after.name).toBe('A')
  })
})

describe('mergeChanges', () => {
  it('drží první before a poslední after', () => {
    const merged = mergeChanges(
      [{ collection: 'personas', id: 'a', before: { id: 'a', name: '1' }, after: { id: 'a', name: '2' } }],
      [{ collection: 'personas', id: 'a', before: { id: 'a', name: '2' }, after: { id: 'a', name: '3' } }],
    )
    expect(merged).toEqual([{ collection: 'personas', id: 'a', before: { id: 'a', name: '1' }, after: { id: 'a', name: '3' } }])
  })
  it('vypustí změny, které se vyrušily', () => {
    const created = { collection: 'personas', id: 'a', before: null, after: { id: 'a' } }
    const deleted = { collection: 'personas', id: 'a', before: { id: 'a' }, after: null }
    expect(mergeChanges([created], [deleted])).toEqual([])
    const there = { collection: 'personas', id: 'b', before: { id: 'b', n: 1 }, after: { id: 'b', n: 2 } }
    const back = { collection: 'personas', id: 'b', before: { id: 'b', n: 2 }, after: { id: 'b', n: 1 } }
    expect(mergeChanges([there], [back])).toEqual([])
  })
})

describe('groupChangesByProject', () => {
  it('rozdělí změny podle projektu, přesun patří oběma', () => {
    const groups = groupChangesByProject([
      { collection: 'projects', id: 'p1', before: null, after: { id: 'p1' } },
      { collection: 'personas', id: 'a', before: { id: 'a', projectId: 'p1' }, after: { id: 'a', projectId: 'p2' } },
    ])
    expect(groups.get('p1')).toHaveLength(2)
    expect(groups.get('p2')).toHaveLength(1)
  })
})

describe('appendHistoryEntry / normalizeHistory', () => {
  it('ořízne historii na limit', () => {
    let h = {}
    for (let i = 0; i < 5; i++) h = appendHistoryEntry(h, { id: `e${i}`, projectId: 'p1', changes: [] }, 3)
    expect(h.p1.map((e) => e.id)).toEqual(['e2', 'e3', 'e4'])
  })
  it('normalizace zahodí poškozené záznamy', () => {
    expect(normalizeHistory(null)).toEqual({})
    expect(normalizeHistory([])).toEqual({})
    const h = normalizeHistory({ p1: [null, { id: 'x' }, { id: 'e', changes: [null, { collection: 'personas', id: 'a' }] }], p2: 'nic' })
    expect(h).toEqual({ p1: [{ id: 'e', projectId: 'p1', kind: 'edit', changes: [{ collection: 'personas', id: 'a' }] }] })
  })
})

describe('buildRevertPatch', () => {
  it('vrátí smazaný záznam a jeho souvislost', () => {
    const persona = { id: 'a', projectId: 'p1', name: 'A' }
    const conn = { id: 'c', projectId: 'p1', entityType1: 'personas', entityId1: 'a' }
    const entry = { changes: [
      { collection: 'personas', id: 'a', before: persona, after: null },
      { collection: 'connections', id: 'c', before: conn, after: null },
    ] }
    const patch = buildRevertPatch(data(), entry)
    expect(patch.personas).toEqual([persona])
    expect(patch.connections).toEqual([conn])
  })
  it('smaže vytvořený záznam', () => {
    const entry = { changes: [{ collection: 'personas', id: 'a', before: null, after: { id: 'a' } }] }
    expect(buildRevertPatch(data({ personas: [{ id: 'a' }, { id: 'b' }] }), entry).personas).toEqual([{ id: 'b' }])
  })
  it('u úpravy vrátí jen změněná pole a zachová pozdější úpravy jiných polí', () => {
    const entry = { changes: [{ collection: 'personas', id: 'a',
      before: { id: 'a', name: 'A', role: 'x' }, after: { id: 'a', name: 'B', role: 'x', extra: 1 } }] }
    const current = data({ personas: [{ id: 'a', name: 'B', role: 'y', extra: 1 }] })
    expect(buildRevertPatch(current, entry).personas).toEqual([{ id: 'a', name: 'A', role: 'y' }])
  })
  it('upravený a mezitím smazaný záznam obnoví v původní podobě', () => {
    const entry = { changes: [{ collection: 'personas', id: 'a', before: { id: 'a', name: 'A' }, after: { id: 'a', name: 'B' } }] }
    expect(buildRevertPatch(data(), entry).personas).toEqual([{ id: 'a', name: 'A' }])
  })
  it('nemění vstupní data', () => {
    const current = data({ personas: [{ id: 'a' }] })
    buildRevertPatch(current, { changes: [{ collection: 'personas', id: 'a', before: null, after: { id: 'a' } }] })
    expect(current.personas).toEqual([{ id: 'a' }])
  })
  it('smazaný záznam, který mezitím existuje, nezdvojí', () => {
    const entry = { changes: [{ collection: 'personas', id: 'a', before: { id: 'a', name: 'A' }, after: null }] }
    expect(buildRevertPatch(data({ personas: [{ id: 'a', name: 'X' }] }), entry).personas).toHaveLength(1)
  })
})

describe('getDeletedProjects / pruneHistory', () => {
  const deletion = { id: 'e2', at: '2026-01-02', changes: [{ collection: 'projects', id: 'p2', before: { id: 'p2', name: 'Starý' }, after: null }] }
  const history = {
    p1: [{ id: 'e1', at: '2026-01-01', changes: [] }],
    p2: [deletion],
    p3: [{ id: 'e3', at: '2026-01-01', changes: [] }],
  }
  it('najde smazané projekty, které nejsou mezi existujícími', () => {
    expect(getDeletedProjects(history, ['p1'])).toEqual([{ projectId: 'p2', name: 'Starý', at: '2026-01-02', entryId: 'e2' }])
    expect(getDeletedProjects(history, ['p1', 'p2'])).toEqual([])
  })
  it('zahodí historii neexistujících projektů, které nelze obnovit', () => {
    expect(Object.keys(pruneHistory(history, ['p1']))).toEqual(['p1', 'p2'])
  })
})

describe('describeHistoryEntry', () => {
  it('hlavní změna je smazaná entita, ne souvislost', () => {
    const { main, items } = describeHistoryEntry({ changes: [
      { collection: 'connections', id: 'c', before: { id: 'c' }, after: null },
      { collection: 'personas', id: 'a', before: { id: 'a', name: 'Jana' }, after: null },
    ] })
    expect(main).toMatchObject({ collection: 'personas', action: 'delete', name: 'Jana' })
    expect(items).toHaveLength(2)
  })
  it('u smazání projektu je hlavní změnou projekt', () => {
    const { main } = describeHistoryEntry({ changes: [
      { collection: 'personas', id: 'a', before: { id: 'a', name: 'Jana' }, after: null },
      { collection: 'projects', id: 'p', before: { id: 'p', name: 'P' }, after: null },
    ] })
    expect(main.collection).toBe('projects')
  })
  it('u úpravy uvádí změněná pole', () => {
    const { main } = describeHistoryEntry({ changes: [{ collection: 'personas', id: 'a', before: { id: 'a', name: 'A' }, after: { id: 'a', name: 'B' } }] })
    expect(main).toMatchObject({ action: 'update', name: 'B', fields: ['name'] })
  })
  it('prázdný záznam', () => {
    expect(describeHistoryEntry(null)).toEqual({ main: null, items: [] })
    expect(recordLabel({ code: 'PER-1' })).toBe('PER-1')
  })
})
