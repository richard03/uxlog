import { describe, it, expect } from 'vitest'
import { sortProjectsForList } from './projectOrder.js'

const ids = (list) => list.map((p) => p.id)

describe('sortProjectsForList', () => {
  it('bez uživatelského pořadí: nejnovější projekty první', () => {
    const projects = [
      { id: 'a', createdAt: '2026-01-01' },
      { id: 'c', createdAt: '2026-03-01T10:00:00.000Z' },
      { id: 'b', createdAt: '2026-02-01' },
    ]
    expect(ids(sortProjectsForList(projects))).toEqual(['c', 'b', 'a'])
  })

  it('uživatelské pořadí se zachová, nový projekt bez pořadí je na začátku', () => {
    const projects = [
      { id: 'a', createdAt: '2026-01-01', sortOrder: 10 },
      { id: 'b', createdAt: '2026-02-01', sortOrder: 0 },
      { id: 'new', createdAt: '2026-04-01' },
      { id: 'c', createdAt: '2026-03-01', sortOrder: 20 },
    ]
    expect(ids(sortProjectsForList(projects))).toEqual(['new', 'b', 'a', 'c'])
  })

  it('stejné pořadí rozhodne datum, pak id; vstup se nemění', () => {
    const projects = [{ id: 'y', sortOrder: 1, createdAt: '1' }, { id: 'x', sortOrder: 1, createdAt: '1' }, { id: 'z', sortOrder: 1, createdAt: '2' }]
    expect(ids(sortProjectsForList(projects))).toEqual(['z', 'x', 'y'])
    expect(ids(projects)).toEqual(['y', 'x', 'z'])
  })

  it('zvládne poškozená data', () => {
    expect(sortProjectsForList(null)).toEqual([])
    expect(ids(sortProjectsForList([null, { id: 'a', sortOrder: 'x' }, 5]))).toEqual(['a'])
  })
})

describe('výchozí sortOrder z továrny projektu', () => {
  it('9999 znamená nenastavené pořadí – nový projekt je na začátku', () => {
    const projects = [
      { id: 'a', createdAt: '2026-01-01', sortOrder: 0 },
      { id: 'b', createdAt: '2026-02-01', sortOrder: 10 },
      { id: 'new', createdAt: '2026-11-05T10:00:00.000Z', sortOrder: 9999 },
    ]
    expect(ids(sortProjectsForList(projects))).toEqual(['new', 'a', 'b'])
  })

  it('projekty jen s výchozí hodnotou se řadí od nejnovějšího', () => {
    const projects = [
      { id: 'old', createdAt: '2026-01-01', sortOrder: 9999 },
      { id: 'new', createdAt: '2026-05-01', sortOrder: 9999 },
    ]
    expect(ids(sortProjectsForList(projects))).toEqual(['new', 'old'])
  })
})
