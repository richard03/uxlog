/**
 * Unit testy pro historii zápisníku (chat).
 */

import { describe, it, expect } from 'vitest'
import {
  createNotebookEntry,
  getNotebookHistory,
  appendNotebookEntry,
  updateNotebookEntry,
  buildOutcomes,
  countOutcomes,
  LEGACY_ENTRY_ID,
} from './notebookChat.js'

const NOW = '2026-10-16T10:00:00.000Z'

describe('createNotebookEntry', () => {
  it('vytvoří záznam s oříznutým textem a výchozím stavem', () => {
    const e = createNotebookEntry('  ahoj  ', { id: 'a', now: NOW })
    expect(e).toEqual({ id: 'a', createdAt: NOW, mode: 'process', text: 'ahoj', answer: '', status: 'processing', error: '', outcomes: [] })
  })

  it('převezme režim „ask“, neplatný režim nahradí „process“', () => {
    expect(createNotebookEntry('?', { id: 'a', now: NOW, mode: 'ask' }).mode).toBe('ask')
    expect(createNotebookEntry('?', { id: 'a', now: NOW, mode: 'xyz' }).mode).toBe('process')
  })

  it('neplatný stav nahradí výchozím a snese null text', () => {
    const e = createNotebookEntry(null, { id: 'a', now: NOW, status: 'nonsense' })
    expect(e.text).toBe('')
    expect(e.status).toBe('processing')
  })
})

describe('getNotebookHistory', () => {
  it('vrátí prázdné pole pro chybějící projekt nebo historii', () => {
    expect(getNotebookHistory(null)).toEqual([])
    expect(getNotebookHistory({})).toEqual([])
    expect(getNotebookHistory({ notebookHistory: 'x' })).toEqual([])
  })

  it('převede starý textový zápisník na první záznam', () => {
    const h = getNotebookHistory({ notebook: ' staré poznámky ', createdAt: NOW, notebookHistory: [{ id: 'b', text: 'nové', status: 'done' }] })
    expect(h.map((e) => e.id)).toEqual([LEGACY_ENTRY_ID, 'b'])
    expect(h[0]).toMatchObject({ text: 'staré poznámky', status: 'saved', createdAt: NOW })
  })

  it('odfiltruje poškozené záznamy a doplní chybějící pole', () => {
    const h = getNotebookHistory({ notebookHistory: [null, 5, { text: 'bez id' }, { id: 'x', status: 'weird', outcomes: [null, { entity: 'persona', outcome: 'confirmed' }] }] })
    expect(h).toHaveLength(1)
    expect(h[0]).toMatchObject({ id: 'x', text: '', status: 'saved', error: '', mode: 'process', answer: '' })
    expect(h[0].outcomes).toEqual([{ entity: 'persona', type: 'create', entityName: '', outcome: 'confirmed' }])
  })
})

describe('appendNotebookEntry / updateNotebookEntry', () => {
  it('přidá záznam na konec a převezme starý zápisník', () => {
    const entry = createNotebookEntry('nový', { id: 'n', now: NOW })
    const res = appendNotebookEntry({ notebook: 'starý' }, entry)
    expect(res.notebook).toBe('')
    expect(res.notebookHistory.map((e) => e.id)).toEqual([LEGACY_ENTRY_ID, 'n'])
  })

  it('aktualizuje jen záznam se shodným id a nezmění id', () => {
    const project = { notebookHistory: [{ id: 'a', text: 'A', status: 'processing' }, { id: 'b', text: 'B', status: 'processing' }] }
    const res = updateNotebookEntry(project, 'b', { status: 'error', error: 'chyba', id: 'zzz' })
    expect(res.notebookHistory[0].status).toBe('processing')
    expect(res.notebookHistory[1]).toMatchObject({ id: 'b', status: 'error', error: 'chyba' })
  })

  it('neznámé id historii nezmění', () => {
    const project = { notebookHistory: [{ id: 'a', text: 'A', status: 'done' }] }
    expect(updateNotebookEntry(project, 'x', { status: 'error' }).notebookHistory[0].status).toBe('done')
  })
})

describe('buildOutcomes / countOutcomes', () => {
  const actions = [
    { _id: 0, entity: 'persona', type: 'create', entityName: 'Jana' },
    { _id: 1, entity: 'goal', type: 'update', entityName: 'Cíl 1' },
  ]

  it('označí potvrzené a přeskočené akce', () => {
    const out = buildOutcomes(actions, new Set([1]))
    expect(out).toEqual([
      { entity: 'persona', type: 'create', entityName: 'Jana', outcome: 'skipped' },
      { entity: 'goal', type: 'update', entityName: 'Cíl 1', outcome: 'confirmed' },
    ])
    expect(countOutcomes(out)).toEqual({ confirmed: 1, skipped: 1 })
  })

  it('snese neplatné vstupy', () => {
    expect(buildOutcomes(null, null)).toEqual([])
    expect(countOutcomes(undefined)).toEqual({ confirmed: 0, skipped: 0 })
  })
})
