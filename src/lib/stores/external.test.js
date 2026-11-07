/**
 * Test sloučení změn z lokálního HTTP API přes skutečný store (záznam, historie, ostatní data).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.spyOn(console, 'log').mockImplementation(() => {})

let store
let applyExternalChanges
beforeAll(async () => {
  store = await import('./index.js')
  ;({ applyExternalChanges } = await import('./external.js'))
})

const tick = () => new Promise((r) => queueMicrotask(r))

describe('změny z lokálního HTTP API (store)', () => {
  it('nahradí jen změněný záznam a zapíše změnu do historie jako externí', async () => {
    const pid = store.addProject({ name: 'Figma' }).id
    const goal = store.addGoal(pid, { name: 'Původní' })
    const other = store.addGoal(pid, { name: 'Beze změny' })
    await tick()
    const historyBefore = store.getProjectHistory(pid).length

    const count = applyExternalChanges([
      { revision: 1, collection: 'goals', record: { ...JSON.parse(JSON.stringify(goal)), name: 'Z Figmy' } },
    ])
    await tick()

    expect(count).toBe(1)
    expect(store.getGoal(goal.id).name).toBe('Z Figmy')
    expect(store.getGoal(other.id).name).toBe('Beze změny')
    const history = store.getProjectHistory(pid)
    expect(history.length).toBe(historyBefore + 1)
    expect(history[0].kind).toBe('external')
  })

  it('shodný záznam nic neuloží', async () => {
    const pid = store.addProject({ name: 'Beze změny' }).id
    const goal = store.addGoal(pid, { name: 'Cíl' })
    await tick()
    const historyBefore = store.getProjectHistory(pid).length
    expect(applyExternalChanges([{ collection: 'goals', record: JSON.parse(JSON.stringify(goal)) }])).toBe(0)
    expect(store.getProjectHistory(pid).length).toBe(historyBefore)
  })
})
