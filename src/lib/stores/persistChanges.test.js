/**
 * persist() posílá do databáze jen změněné a smazané záznamy.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

const batches = []
vi.mock('../storage.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    saveDataChanges: vi.fn(async (json, changes) => { batches.push({ json, changes }) }),
  }
})
vi.spyOn(console, 'log').mockImplementation(() => {})

/** Všechny změny odeslané od vyprázdnění `batches` (jedna akce může uložit víckrát). */
function sent() {
  return {
    upserts: batches.flatMap((b) => b.changes.upserts),
    deletes: batches.flatMap((b) => b.changes.deletes),
  }
}

let store
beforeAll(async () => {
  store = await import('./index.js')
})

describe('persist ukládá jen změny', () => {
  it('pošle jen změněný záznam a smazání, celý stav jen jako JSON pro zrcadlo', () => {
    const pid = store.addProject({ name: 'Výkon' }).id
    const a = store.addGoal(pid, { name: 'A' })
    const b = store.addGoal(pid, { name: 'B' })
    batches.length = 0

    store.updateGoal(a.id, { name: 'A2' })
    // Cíl a projekt (datum poslední práce), nic jiného
    const { upserts, deletes } = sent()
    expect(upserts.map((u) => u.collection).sort()).toEqual(['goals', 'projects'])
    expect(upserts.find((u) => u.collection === 'goals')).toMatchObject({ record: { id: a.id, name: 'A2' } })
    expect(deletes).toEqual([])
    expect(JSON.parse(batches.at(-1).json).goals.map((g) => g.id)).toEqual(expect.arrayContaining([a.id, b.id]))

    batches.length = 0
    store.deleteGoal(b.id)
    expect(sent().deletes).toEqual([{ collection: 'goals', id: b.id }])
    expect(sent().upserts.some((u) => u.record.id === b.id)).toBe(false)
  })

  it('odeslaný záznam je kopie – pozdější úprava stavu ho nezmění', () => {
    const pid = store.addProject({ name: 'Kopie' }).id
    const g = store.addGoal(pid, { name: 'Původní' })
    batches.length = 0
    store.updateGoal(g.id, { name: 'Odesláno' })
    const record = sent().upserts.find((u) => u.record.id === g.id).record
    store.getGoal(g.id).name = 'Později'
    expect(record.name).toBe('Odesláno')
  })
})
