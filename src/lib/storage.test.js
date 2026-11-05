import { describe, it, expect } from 'vitest'
import { pickNewer, stripLegacySyncFields, deduplicateData, stripRemovedProjectFields } from './storage.js'

describe('pickNewer', () => {
  it('rozhoduje podle updatedAt, pak lastWorkedAt a createdAt', () => {
    const a = { id: 1, updatedAt: '2026-02-01' }
    const b = { id: 1, updatedAt: '2026-03-01' }
    expect(pickNewer(a, b)).toBe(b)
    expect(pickNewer({ id: 1, createdAt: '2026-01-01' }, { id: 1, lastWorkedAt: '2026-01-02' }).lastWorkedAt).toBe('2026-01-02')
  })

  it('přežité _ts už nemá přednost před novějším updatedAt', () => {
    const old = { id: 1, _ts: 9999999999999, updatedAt: '2026-01-01' }
    const fresh = { id: 1, updatedAt: '2026-05-01' }
    expect(pickNewer(old, fresh)).toBe(fresh)
  })

  it('bez časů vrátí první záznam', () => {
    const a = { id: 1 }
    expect(pickNewer(a, { id: 1 })).toBe(a)
  })
})

describe('stripLegacySyncFields', () => {
  it('odstraní _ts a _uxlog_id ze všech kolekcí a ostatní pole nechá', () => {
    const data = {
      projects: [{ id: 'p', _ts: 1 }],
      personas: [{ id: 'a', name: 'Anna', _ts: 1, _uxlog_id: 'a' }, null],
      connections: [{ id: 'c', _uxlog_id: 'c' }],
    }
    stripLegacySyncFields(data)
    expect(data).toEqual({
      projects: [{ id: 'p' }],
      personas: [{ id: 'a', name: 'Anna' }, null],
      connections: [{ id: 'c' }],
    })
  })

  it('zvládne poškozená data', () => {
    expect(stripLegacySyncFields({ goals: 'x' })).toEqual({ goals: 'x' })
    expect(stripLegacySyncFields({})).toEqual({})
  })
})

describe('deduplicateData', () => {
  it('ponechá novější z duplicitních záznamů', () => {
    const data = { goals: [{ id: 'g', name: 'stará', updatedAt: '2026-01-01' }, { id: 'g', name: 'nová', updatedAt: '2026-02-01' }] }
    deduplicateData(data)
    expect(data.goals).toEqual([{ id: 'g', name: 'nová', updatedAt: '2026-02-01' }])
  })
})

describe('stripRemovedProjectFields', () => {
  it('odstraní z projektů zrušený termín projektu, aktivitám ho nechá', () => {
    const data = { projects: [{ id: 'p', deadline: '2026-12-31', name: 'P' }, null], activities: [{ id: 'a', deadline: '2026-11-30' }] }
    stripRemovedProjectFields(data)
    expect(data.projects[0]).toEqual({ id: 'p', name: 'P' })
    expect(data.activities[0].deadline).toBe('2026-11-30')
  })

  it('zvládne neplatný vstup', () => {
    expect(stripRemovedProjectFields(null)).toBeNull()
  })
})
