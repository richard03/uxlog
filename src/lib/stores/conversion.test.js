/**
 * Test změny typu entity přes skutečný store (nový záznam, souvislosti, plátno, historie).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.spyOn(console, 'log').mockImplementation(() => {})

let store
beforeAll(async () => {
  store = await import('./index.js')
})

const tick = () => new Promise((r) => queueMicrotask(r))

describe('změna typu entity (store)', () => {
  it('vytvoří nový záznam, přesměruje souvislosti a kartičku a původní smaže', async () => {
    const pid = store.addProject({ name: 'Převod' }).id
    const req = store.addRequirement(pid, { name: 'Export', code: 'REQ-001' })
    const persona = store.addPersona(pid, { name: 'Jana' })
    store.addConnection(pid, 'requirements', req.id, 'personas', persona.id, 'pozn.')
    store.moveCanvasCard(pid, `requirements:${req.id}`, { x: 50, y: 60 })
    store.setCanvasCardColor(pid, [`requirements:${req.id}`], '#fde68a')
    await tick()
    const historyBefore = store.getProjectHistory(pid).length

    const scenario = store.convertEntity('requirements', req.id, 'scenarios', {
      name: 'Export jako scénář', code: 'SCN-001', description: 'Popis', id: 'podvrh', projectId: 'jiny',
    })
    await tick()

    expect(scenario).toBeTruthy()
    expect(scenario.id).not.toBe('podvrh')
    expect(store.getScenario(scenario.id)).toMatchObject({ projectId: pid, name: 'Export jako scénář', code: 'SCN-001', description: 'Popis', type: 'main' })
    expect(store.getRequirement(req.id)).toBeNull()

    const conns = store.getConnectionsFor('scenarios', scenario.id)
    expect(conns).toHaveLength(1)
    expect(conns[0].note).toBe('pozn.')
    expect(store.getConnectionsFor('requirements', req.id)).toHaveLength(0)

    const canvas = store.getProject(pid).canvas
    expect(canvas.positions[`scenarios:${scenario.id}`]).toEqual({ x: 50, y: 60 })
    expect(canvas.colors[`scenarios:${scenario.id}`]).toBe('#fde68a')
    expect(canvas.positions[`requirements:${req.id}`]).toBeUndefined()

    // Jedna akce = jeden záznam historie; vrácení obnoví původní záznam a souvislost
    const entries = store.getProjectHistory(pid)
    expect(entries).toHaveLength(historyBefore + 1)
    expect(store.revertHistoryEntry(pid, entries[0].id)).toBe(true)
    await tick()
    expect(store.getRequirement(req.id)?.name).toBe('Export')
    expect(store.getScenario(scenario.id)).toBeNull()
    expect(store.getConnectionsFor('requirements', req.id)).toHaveLength(1)
  })

  it('nepřevede neznámý záznam, stejný ani nepřevoditelný typ', () => {
    const pid = store.addProject({ name: 'Nic' }).id
    const goal = store.addGoal(pid, { name: 'Cíl' })
    expect(store.convertEntity('goals', 'neexistuje', 'risks', {})).toBeNull()
    expect(store.convertEntity('goals', goal.id, 'goals', {})).toBeNull()
    expect(store.convertEntity('goals', goal.id, 'activities', {})).toBeNull()
    expect(store.getGoal(goal.id)).toBeTruthy()
  })
})
