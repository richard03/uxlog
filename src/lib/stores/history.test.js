/**
 * Test historie změn přes skutečný store (persist → záznam → vrácení).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
})
vi.spyOn(console, 'log').mockImplementation(() => {})

let store
beforeAll(async () => {
  store = await import('./index.js')
})

const tick = () => new Promise((r) => queueMicrotask(r))

describe('historie změn projektu (store)', () => {
  it('smazání záznamu jde vrátit a vrácení jde opět vrátit', async () => {
    const project = store.addProject({ name: 'Test' })
    const pid = project.id
    const persona = store.addPersona(pid, { name: 'Jana' })
    await tick()
    store.deletePersona(persona.id)
    await tick()

    const [deletion] = store.getProjectHistory(pid)
    expect(deletion.changes.map((c) => [c.collection, c.after])).toEqual([['personas', null]])

    expect(store.revertHistoryEntry(pid, deletion.id)).toBe(true)
    await tick()
    expect(store.getPersona(persona.id)?.name).toBe('Jana')

    const [revert, original] = store.getProjectHistory(pid)
    expect(revert).toMatchObject({ kind: 'revert', revertOf: deletion.id })
    expect(original.reverted).toBe(true)

    // Vrácení vrácení = persona je znovu smazaná a původní záznam opět platí
    store.revertHistoryEntry(pid, revert.id)
    await tick()
    expect(store.getPersona(persona.id)).toBeNull()
    const entries = store.getProjectHistory(pid)
    expect(entries.find((e) => e.id === deletion.id).reverted).toBe(false)
  })

  it('jedna akce s více persist() je jeden záznam; úprava jen updatedAt se nezapíše', async () => {
    const pid = store.addProject({ name: 'Druhý' }).id
    await tick()
    const before = store.getProjectHistory(pid).length
    store.updateProject(pid, {})
    await tick()
    expect(store.getProjectHistory(pid).length).toBe(before)
    store.addRisk(pid, { name: 'R' })
    await tick()
    expect(store.getProjectHistory(pid).length).toBe(before + 1)
  })

  it('smazaný projekt lze obnovit i s jeho záznamy', async () => {
    const pid = store.addProject({ name: 'Ke smazání' }).id
    store.addGoal(pid, { name: 'Cíl' })
    await tick()
    store.deleteProject(pid)
    await tick()
    expect(store.getDeletedProjects().map((d) => d.projectId)).toContain(pid)
    expect(store.restoreDeletedProject(pid)).toBe(true)
    await tick()
    expect(store.getProject(pid)?.name).toBe('Ke smazání')
    expect(store.getGoals(pid).map((g) => g.name)).toEqual(['Cíl'])
    expect(store.getDeletedProjects().map((d) => d.projectId)).not.toContain(pid)
  })

  it('historie se ukládá do vlastního klíče', async () => {
    expect(JSON.parse(storage.get('uxlog_history'))).toBeTypeOf('object')
  })

  it('initStore znovu načte historii z úložiště (Tauri obnovuje localStorage až po importu)', async () => {
    const pid = store.addProject({ name: 'Načtení' }).id
    await tick()
    const saved = storage.get('uxlog_history')
    storage.set('uxlog_history', JSON.stringify({ [pid]: [] }))
    store.initStore()
    expect(store.getProjectHistory(pid)).toEqual([])
    storage.set('uxlog_history', saved)
    store.initStore()
    expect(store.getProjectHistory(pid).length).toBeGreaterThan(0)
  })
})
