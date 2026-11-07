import { describe, it, expect, vi } from 'vitest'

// Úložiště v paměti místo SQLite
const stored = new Map()
const writes = []
vi.mock('./tauriBridge.js', () => ({
  readStoredValue: (key) => (stored.has(key) ? stored.get(key) : null),
  writeStoredValue: vi.fn(async (key, value) => {
    writes.push(key)
    stored.set(key, value)
  }),
}))

const { loadData, saveData, getDataLoadError, onDataLoadErrorChange } = await import('./storage.js')

describe('nečitelná data se nepřepíšou prázdným stavem', () => {
  it('chyba načtení zastaví ukládání, úspěšné načtení ho zase povolí', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen = []
    const stop = onDataLoadErrorChange((e) => seen.push(e))

    stored.set('uxlog_data', '{"projects": [')
    const data = loadData()
    expect(data.projects).toEqual([])
    expect(getDataLoadError()).toBeTruthy()
    expect(seen).toHaveLength(1)

    await expect(saveData(data)).rejects.toThrow(/pozastavené/)
    expect(stored.get('uxlog_data')).toBe('{"projects": [')
    expect(writes).not.toContain('uxlog_data')

    stored.set('uxlog_data', JSON.stringify({ projects: [{ id: 'p1' }] }))
    expect(loadData().projects).toEqual([{ id: 'p1' }])
    expect(getDataLoadError()).toBeNull()
    expect(seen.at(-1)).toBeNull()
    await saveData({ projects: [{ id: 'p1' }, { id: 'p2' }] })
    expect(JSON.parse(stored.get('uxlog_data')).projects).toHaveLength(2)
    stop()
  })

  it('data, která nejsou objekt, jsou také chyba načtení', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stored.set('uxlog_data', '[1,2]')
    loadData()
    expect(getDataLoadError()).toBeTruthy()
    stored.set('uxlog_data', 'null')
    loadData()
    expect(getDataLoadError()).toBeTruthy()
    stored.delete('uxlog_data')
    loadData()
    expect(getDataLoadError()).toBeNull()
  })
})
