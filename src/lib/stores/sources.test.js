/**
 * Zdroje: převod starších zpráv Zápisníku na zdroje při startu.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.spyOn(console, 'log').mockImplementation(() => {})

let store
beforeAll(async () => {
  store = await import('./index.js')
})

describe('migrateNotebookToSources', () => {
  it('převede zprávy „Vložit informace“ na zdroje s kódy, dotazy nechá v chatu a podruhé nic nedělá', () => {
    const pid = store.addProject({ name: 'Převod' }).id
    const project = store.getProject(pid)
    project.notebook = 'Starý zápisník'
    project.notebookHistory = [
      { id: 'a', mode: 'process', text: 'Poznámky z workshopu\nDalší řádek', status: 'done', createdAt: '2026-02-01T10:00:00.000Z' },
      { id: 'b', mode: 'ask', text: 'Otázka', answer: 'Odpověď', status: 'done', createdAt: '2026-02-02T10:00:00.000Z' },
    ]

    expect(store.migrateNotebookToSources()).toBe(2)
    const sources = store.getSources(pid)
    expect(sources.map((s) => s.code)).toEqual(['ZDR-001', 'ZDR-002'])
    expect(sources.map((s) => s.name)).toEqual(['Starý zápisník', 'Poznámky z workshopu'])
    expect(sources[1]).toMatchObject({ kind: 'other', processedAt: '2026-02-01T10:00:00.000Z', content: 'Poznámky z workshopu\nDalší řádek' })
    expect(store.getProject(pid).notebookHistory.map((e) => e.id)).toEqual(['b'])
    expect(store.getProject(pid).notebook).toBe('')

    expect(store.migrateNotebookToSources()).toBe(0)
    expect(store.getSources(pid)).toHaveLength(2)
  })
})

describe('addSourceForEntity', () => {
  it('přidá zdroj propojený s aktivitou', () => {
    const pid = store.addProject({ name: 'Meeting' }).id
    const activity = store.addActivity(pid, { name: 'Workshop' })
    const source = store.addSourceForEntity(pid, 'activities', activity.id, { name: 'Zápis', kind: 'meeting', content: 'Text' })
    expect(source).toMatchObject({ projectId: pid, name: 'Zápis', kind: 'meeting', content: 'Text' })
    const links = store.getConnectionsFor('activities', activity.id)
    expect(links.some((c) => c.entityId1 === source.id || c.entityId2 === source.id)).toBe(true)
  })

  it('neexistující záznam nebo cizí projekt → nic nepřidá', () => {
    const pid = store.addProject({ name: 'Jiný' }).id
    const count = store.getSources(pid).length
    expect(store.addSourceForEntity(pid, 'activities', 'neexistuje', { content: 'x' })).toBeNull()
    expect(store.getSources(pid)).toHaveLength(count)
  })
})
