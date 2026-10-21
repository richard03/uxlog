/**
 * Test dokumentu projektu přes skutečný store (úprava textu se propíše do dat a do historie).
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
const description = { key: 'description', label: 'Popis', type: 'textarea' }

describe('dokument projektu (store)', () => {
  it('sestaví dokument z entit projektu', () => {
    const pid = store.addProject({ name: 'Dokument' }).id
    store.addPersona(pid, { name: 'Jana', description: 'Nákupčí' })
    const doc = store.getProjectDocument(pid, { fields: { persona: [description] }, sectionTitles: { personas: 'Persony' } })
    const personas = doc.sections.find((s) => s.stateKey === 'personas')
    expect(doc.title).toBe('Dokument')
    expect(personas.items[0]).toMatchObject({ name: 'Jana' })
    expect(personas.items[0].blocks[0].text).toBe('Nákupčí')
  })

  it('úprava pole se uloží do entity a zapíše do historie; beze změny se nic neuloží', async () => {
    const pid = store.addProject({ name: 'Úpravy' }).id
    const persona = store.addPersona(pid, { name: 'Jana', description: 'Stará' })
    await tick()
    const before = store.getProjectHistory(pid).length

    expect(store.updateDocumentField(pid, 'personas', persona.id, description, 'Stará\n')).toBe(false)
    await tick()
    expect(store.getProjectHistory(pid)).toHaveLength(before)

    expect(store.updateDocumentField(pid, 'personas', persona.id, description, 'Nová')).toBe(true)
    await tick()
    expect(store.getPersona(persona.id).description).toBe('Nová')
    expect(store.getProjectHistory(pid)).toHaveLength(before + 1)
  })

  it('neupraví entitu jiného projektu ani neznámý typ', () => {
    const pid = store.addProject({ name: 'A' }).id
    const other = store.addProject({ name: 'B' }).id
    const persona = store.addPersona(other, { name: 'Cizí' })
    expect(store.updateDocumentEntity(pid, 'personas', persona.id, { name: 'X' })).toBe(false)
    expect(store.updateDocumentEntity(other, 'nic', persona.id, { name: 'X' })).toBe(false)
    expect(store.updateDocumentEntity(other, 'personas', persona.id, {})).toBe(false)
    expect(store.getPersona(persona.id).name).toBe('Cizí')
    expect(store.updateDocumentEntity(other, 'personas', persona.id, { name: 'Jiná' })).toBe(true)
    expect(store.getPersona(persona.id).name).toBe('Jiná')
  })
})
