/**
 * Test plátna projektu přes skutečný store (pozice kartiček, pohled, historie).
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

describe('plátno projektu (store)', () => {
  it('přesun kartičky se uloží na projekt, nezapíše do historie a nezmění lastWorkedAt', async () => {
    const pid = store.addProject({ name: 'Plátno' }).id
    const persona = store.addPersona(pid, { name: 'Jana' })
    await tick()
    const historyBefore = store.getProjectHistory(pid).length
    const lastWorkedAt = store.getProject(pid).lastWorkedAt

    const card = store.getCanvasCards(pid).find((c) => c.id === persona.id)
    expect(card).toBeTruthy()
    store.moveCanvasCard(pid, card.key, { x: 321, y: 123 })
    await tick()

    expect(store.getCanvasCards(pid).find((c) => c.id === persona.id)).toMatchObject({ x: 321, y: 123 })
    expect(store.getProject(pid).canvas.positions[card.key]).toEqual({ x: 321, y: 123 })
    expect(store.getProject(pid).lastWorkedAt).toBe(lastWorkedAt)
    expect(store.getProjectHistory(pid)).toHaveLength(historyBefore)
  })

  it('pozice smazané entity se při dalším přesunu zahodí', async () => {
    const pid = store.addProject({ name: 'Úklid' }).id
    const a = store.addGoal(pid, { name: 'A' })
    const b = store.addGoal(pid, { name: 'B' })
    store.moveCanvasCard(pid, `goals:${a.id}`, { x: 1, y: 1 })
    store.deleteGoal(a.id)
    store.moveCanvasCard(pid, `goals:${b.id}`, { x: 2, y: 2 })
    await tick()
    expect(Object.keys(store.getCanvasLayout(pid).positions)).toEqual([`goals:${b.id}`])
  })

  it('posun skupiny uloží všechny pozice jedním uložením', async () => {
    const pid = store.addProject({ name: 'Skupina' }).id
    const a = store.addGoal(pid, { name: 'A' })
    const b = store.addRisk(pid, { name: 'B' })
    await tick()
    store.moveCanvasCards(pid, { [`goals:${a.id}`]: { x: 10, y: 20 }, [`risks:${b.id}`]: { x: 30, y: 40 } })
    expect(store.getCanvasLayout(pid).positions).toEqual({
      [`goals:${a.id}`]: { x: 10, y: 20 },
      [`risks:${b.id}`]: { x: 30, y: 40 },
    })
    expect(() => store.moveCanvasCards(pid, {})).not.toThrow()
  })

  it('uloží pohled; neznámý projekt nic nezmění', () => {
    const pid = store.addProject({ name: 'Pohled' }).id
    store.setCanvasViewport(pid, { x: 10, y: 20, zoom: 1.5 })
    expect(store.getCanvasLayout(pid).viewport).toEqual({ x: 10, y: 20, zoom: 1.5 })
    expect(() => store.setCanvasViewport('neexistuje', { x: 0, y: 0, zoom: 1 })).not.toThrow()
    expect(() => store.moveCanvasCard('neexistuje', 'goals:x', { x: 0, y: 0 })).not.toThrow()
    expect(store.getCanvasCards('neexistuje')).toEqual([])
  })
})

describe('kontextové akce výběru na plátně (store)', () => {
  it('barva kartiček se uloží do rozvržení, nemění entitu ani lastWorkedAt a jde odebrat', async () => {
    const pid = store.addProject({ name: 'Barvy' }).id
    const a = store.addGoal(pid, { name: 'A' })
    const b = store.addRisk(pid, { name: 'B' })
    await tick()
    const lastWorkedAt = store.getProject(pid).lastWorkedAt
    const keys = [`goals:${a.id}`, `risks:${b.id}`]
    const colorsOf = () => keys.map((k) => store.getCanvasCards(pid).find((c) => c.key === k).color)

    store.setCanvasCardColor(pid, keys, '#FDE68A')
    expect(colorsOf()).toEqual(['#fde68a', '#fde68a'])
    expect(store.getCanvasCards(pid).filter((c) => c.color)).toHaveLength(2)
    expect(store.getGoal(a.id)).not.toHaveProperty('color')
    expect(store.getProject(pid).lastWorkedAt).toBe(lastWorkedAt)

    store.setCanvasCardColor(pid, [`risks:${b.id}`], null)
    expect(colorsOf()).toEqual(['#fde68a', null])
  })

  it('smazání výběru smaže entity jedním záznamem historie, který jde vrátit', async () => {
    const pid = store.addProject({ name: 'Mazání' }).id
    const persona = store.addPersona(pid, { name: 'Jana' })
    const risk = store.addRisk(pid, { name: 'Zpoždění' })
    const kept = store.addGoal(pid, { name: 'Zůstane' })
    await tick()
    const keys = [`personas:${persona.id}`, `risks:${risk.id}`]
    store.setCanvasCardColor(pid, keys, '#2563eb')
    const historyBefore = store.getProjectHistory(pid).length

    expect(store.deleteCanvasCards(pid, [...keys, 'nesmysl', 'goals:neexistuje'])).toBe(2)
    await tick()
    expect(store.getPersona(persona.id)).toBeNull()
    expect(store.getRisk(risk.id)).toBeNull()
    expect(store.getGoal(kept.id)?.name).toBe('Zůstane')
    expect(store.getProject(pid).canvas.colors).toEqual({})

    const history = store.getProjectHistory(pid)
    expect(history).toHaveLength(historyBefore + 1)
    store.revertHistoryEntry(pid, history[0].id)
    await tick()
    expect(store.getPersona(persona.id)?.name).toBe('Jana')
    expect(store.getRisk(risk.id)?.name).toBe('Zpoždění')
  })

  it('nesmaže entitu jiného projektu, i když dostane její klíč', async () => {
    const pid = store.addProject({ name: 'Můj' }).id
    const other = store.addProject({ name: 'Cizí' }).id
    const foreign = store.addGoal(other, { name: 'Cizí cíl' })
    expect(store.deleteCanvasCards(pid, [`goals:${foreign.id}`])).toBe(0)
    expect(store.getGoal(foreign.id)?.name).toBe('Cizí cíl')
  })

  it('hromadný přesun a kopie do jiného projektu; přesun uklidí rozvržení zdrojového projektu', async () => {
    const source = store.addProject({ name: 'Zdroj' }).id
    const target = store.addProject({ name: 'Cíl' }).id
    const goal = store.addGoal(source, { name: 'G' })
    const task = store.addTask(source, { name: 'T' })
    const key = `goals:${goal.id}`
    store.moveCanvasCard(source, key, { x: 900, y: 900 })
    store.setCanvasCardColor(source, [key], '#fde68a')

    const items = [{ stateKey: 'goals', id: goal.id }, { stateKey: 'tasks', id: task.id }]
    expect(store.copyEntitiesToProject(items, target)).toHaveLength(2)
    expect(store.getGoals(target).map((g) => g.name)).toEqual(['G'])
    expect(store.getGoals(source).map((g) => g.name)).toEqual(['G'])

    expect(store.moveEntitiesToProject(items, target)).toBe(2)
    expect(store.getGoals(source)).toEqual([])
    expect(store.getGoals(target).map((g) => g.name)).toEqual(['G', 'G'])
    const layout = store.getCanvasLayout(source)
    expect(layout.positions[key]).toBeUndefined()
    expect(layout.colors[key]).toBeUndefined()

    expect(store.moveEntitiesToProject(items, 'neexistuje')).toBe(0)
    expect(store.copyEntitiesToProject(items, 'neexistuje')).toEqual([])
  })
})
