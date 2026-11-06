/**
 * Načtení změn ze složky dat přes skutečný store (zápis, mazání s úklidem odkazů, historie).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'

vi.spyOn(console, 'log').mockImplementation(() => {})

let store
let applyVaultChanges
let replaceStateFromVault
beforeAll(async () => {
  store = await import('./index.js')
  ;({ applyVaultChanges, replaceStateFromVault } = await import('./vaultImport.js'))
})

const tick = () => new Promise((r) => queueMicrotask(r))

describe('applyVaultChanges', () => {
  it('vytvoří, upraví a smaže záznamy jednou akcí (jeden záznam historie)', async () => {
    const pid = store.addProject({ name: 'Složka' }).id
    const anna = store.addPersona(pid, { name: 'Anna', motivation: 'Čas', extraSections: [{ heading: 'X', content: 'y' }] })
    const req = store.addRequirement(pid, { name: 'Filtr' })
    store.updatePersona(anna.id, { requirementIds: [req.id] })
    await tick()
    const historyBefore = store.getProjectHistory(pid).length

    const { applied, skipped } = applyVaultChanges([
      { kind: 'create', collection: 'goals', projectId: pid, record: { id: 'g-new', projectId: pid, code: 'GOL-001', name: 'Nový cíl' } },
      { kind: 'update', collection: 'personas', entityId: anna.id, projectId: pid, patch: { motivation: 'Rychlost', extraSections: undefined } },
      { kind: 'delete', collection: 'requirements', entityId: req.id, projectId: pid },
    ])
    await tick()

    expect(applied).toHaveLength(3)
    expect(skipped).toEqual([])
    expect(store.getGoal('g-new')).toMatchObject({ name: 'Nový cíl', projectId: pid })
    const persona = store.getPersona(anna.id)
    expect(persona.motivation).toBe('Rychlost')
    expect('extraSections' in persona).toBe(false)
    expect(store.getRequirement(req.id)).toBeNull()
    expect(persona.requirementIds).toEqual([]) // odkaz uklidilo běžné mazání
    expect(store.getProjectHistory(pid)).toHaveLength(historyBefore + 1)
  })

  it('nahradí souvislosti projektu a nepoužitelné změny vrátí jako přeskočené', async () => {
    const pid = store.addProject({ name: 'Souvislosti' }).id
    const other = store.addProject({ name: 'Jiný' }).id
    store.state.connections.push({ id: 'keep', projectId: other }, { id: 'old', projectId: pid })
    const { skipped } = applyVaultChanges([
      { kind: 'connections', projectId: pid, after: [{ id: 'new', projectId: pid, entityType1: 'a', entityId1: '1', entityType2: 'b', entityId2: '2' }] },
      { kind: 'update', collection: 'personas', entityId: 'neexistuje', patch: { name: 'x' } },
      { kind: 'create', collection: 'goals', record: { id: 'g-new' } },
      { kind: 'unsupported' },
    ])
    expect(store.state.connections.map((c) => c.id)).toEqual(expect.arrayContaining(['keep', 'new']))
    expect(store.state.connections.some((c) => c.id === 'old')).toBe(false)
    expect(skipped).toHaveLength(3)
  })
})

describe('replaceStateFromVault', () => {
  it('nahradí data stavem ze složky a změny zapíše do historie jako vratné', async () => {
    const pid = store.addProject({ name: 'Obnova' }).id
    const anna = store.addPersona(pid, { name: 'Anna' })
    await tick()
    const historyBefore = store.getProjectHistory(pid).length

    const next = JSON.parse(JSON.stringify(store.state))
    next.personas = next.personas.map((p) => (p.id === anna.id ? { ...p, name: 'Anna ze složky' } : p))
    delete next.goals
    replaceStateFromVault(next)
    await tick()

    expect(store.getPersona(anna.id).name).toBe('Anna ze složky')
    expect(store.state.goals).toEqual([])
    const history = store.getProjectHistory(pid)
    expect(history).toHaveLength(historyBefore + 1)
    expect(history[0].kind).toBe('external')

    store.revertHistoryEntry(pid, history[0].id)
    await tick()
    expect(store.getPersona(anna.id).name).toBe('Anna')
  })
})
