import { describe, it, expect } from 'vitest'
import { mergeExternalChanges } from './externalChanges.js'

const COLLECTIONS = ['projects', 'goals', 'bugs', 'connections']

function data() {
  return {
    projects: [{ id: 'p1', name: 'Projekt' }],
    goals: [{ id: 'g1', projectId: 'p1', name: 'A' }, { id: 'g2', projectId: 'p1', name: 'B' }],
    bugs: [],
    connections: [],
  }
}

describe('mergeExternalChanges', () => {
  it('replaces a changed record in place and leaves the rest untouched', () => {
    const d = data()
    const { collections, count } = mergeExternalChanges(d, [
      { collection: 'goals', record: { id: 'g1', projectId: 'p1', name: 'Z Figmy' } },
    ], COLLECTIONS)
    expect(count).toBe(1)
    expect(collections.goals.map((g) => g.name)).toEqual(['Z Figmy', 'B'])
    expect(collections.goals[1]).toBe(d.goals[1])
    expect(Object.keys(collections)).toEqual(['goals'])
    // vstup se nemění
    expect(d.goals[0].name).toBe('A')
  })

  it('appends new records', () => {
    const { collections } = mergeExternalChanges(data(), [
      { collection: 'bugs', record: { id: 'b1', projectId: 'p1', name: 'Chyba' } },
    ], COLLECTIONS)
    expect(collections.bugs).toEqual([{ id: 'b1', projectId: 'p1', name: 'Chyba' }])
  })

  it('merges only sent fields into the current record', () => {
    const d = data()
    d.goals[0].description = 'Z aplikace'
    const { collections, count } = mergeExternalChanges(d, [
      { collection: 'goals', record: { id: 'g1', name: 'Z Figmy' } },
    ], COLLECTIONS)
    expect(count).toBe(1)
    expect(collections.goals[0]).toEqual({ id: 'g1', projectId: 'p1', name: 'Z Figmy', description: 'Z aplikace' })
  })

  it('skips a partial change of a record the app does not have', () => {
    const { count } = mergeExternalChanges(data(), [
      { collection: 'goals', record: { id: 'neni', name: 'X' } },
    ], COLLECTIONS)
    expect(count).toBe(0)
  })

  it('last change of the same record wins', () => {
    const { collections, count } = mergeExternalChanges(data(), [
      { collection: 'goals', record: { id: 'g1', projectId: 'p1', name: '1' } },
      { collection: 'goals', record: { id: 'g1', projectId: 'p1', name: '2' } },
    ], COLLECTIONS)
    expect(count).toBe(1)
    expect(collections.goals[0].name).toBe('2')
  })

  it('skips identical records', () => {
    const d = data()
    const { collections, count } = mergeExternalChanges(d, [
      { collection: 'goals', record: { ...d.goals[0] } },
    ], COLLECTIONS)
    expect(count).toBe(0)
    expect(collections).toEqual({})
  })

  it('skips unknown collections, invalid records and orphans', () => {
    const { count } = mergeExternalChanges(data(), [
      { collection: 'secrets', record: { id: 'x' } },
      { collection: 'goals', record: { name: 'bez id' } },
      { collection: 'goals', record: null },
      { collection: 'goals', record: { id: 'g9', projectId: 'missing' } },
      null,
    ], COLLECTIONS)
    expect(count).toBe(0)
  })

  it('accepts records of a project that arrives in the same batch', () => {
    const { collections, count } = mergeExternalChanges(data(), [
      { collection: 'goals', record: { id: 'g9', projectId: 'p2' } },
      { collection: 'projects', record: { id: 'p2', name: 'Nový' } },
    ], COLLECTIONS)
    expect(count).toBe(2)
    expect(collections.projects.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('ignores key order when comparing', () => {
    const { count } = mergeExternalChanges(data(), [
      { collection: 'goals', record: { name: 'A', projectId: 'p1', id: 'g1' } },
    ], COLLECTIONS)
    expect(count).toBe(0)
  })

  it('drops legacy sync fields (record then equals the current one)', () => {
    const { collections } = mergeExternalChanges(data(), [
      { collection: 'goals', record: { id: 'g1', projectId: 'p1', name: 'A', _ts: 5, _uxlog_id: 'g1' } },
    ], COLLECTIONS)
    expect(collections.goals?.[0] ?? null).toBeNull()
  })

  it('tolerates missing data and changes', () => {
    expect(mergeExternalChanges(null, null, null)).toEqual({ collections: {}, count: 0 })
    const { collections } = mergeExternalChanges({}, [{ collection: 'projects', record: { id: 'p1' } }], COLLECTIONS)
    expect(collections.projects).toEqual([{ id: 'p1' }])
  })
})
