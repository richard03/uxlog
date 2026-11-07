import { describe, it, expect, vi } from 'vitest'

// Prostředí Tauri: SQLite backend v paměti, starý localStorage z předchozí verze
const sqlite = new Map()
let failSave = false
let externalLog = null
let lastSince = null
let failChanges = false
const changeBatches = []
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd, args) => {
    if (cmd === 'load_all_storage') return Object.fromEntries(sqlite)
    if (cmd === 'save_storage') {
      if (failSave) throw new Error('disk full')
      sqlite.set(args.key, args.value)
    }
    if (cmd === 'remove_storage') sqlite.delete(args.key)
    if (cmd === 'load_storage') return sqlite.has(args.key) ? sqlite.get(args.key) : null
    if (cmd === 'save_app_data_changes') {
      if (failChanges) throw new Error('db locked')
      changeBatches.push(args)
      return null
    }
    if (cmd === 'external_changes_since') {
      lastSince = args.since
      return externalLog
    }
    return null
  }),
}))

const local = new Map()
const localStorage = {
  get length() { return local.size },
  key: (i) => [...local.keys()][i] ?? null,
  getItem: (k) => (local.has(k) ? local.get(k) : null),
  setItem: (k, v) => local.set(k, String(v)),
  removeItem: (k) => local.delete(k),
}
globalThis.window = { __TAURI_INTERNALS__: {}, localStorage }

sqlite.set('uxlog_data', '{"projects":["ze SQLite"]}')
local.set('uxlog_data', '{"projects":["zastaralé"]}')
local.set('uxlog_config', '{"jenVLocalStorage":true}')
local.set('jina_aplikace', 'nechat')

const bridge = await import('./tauriBridge.js')
await bridge.initStorage()

describe('úložiště aplikace (SQLite)', () => {
  it('při startu platí SQLite, chybějící klíče převezme z localStorage a ten vyčistí', () => {
    expect(bridge.readStoredValue('uxlog_data')).toBe('{"projects":["ze SQLite"]}')
    expect(bridge.readStoredValue('uxlog_config')).toBe('{"jenVLocalStorage":true}')
    expect(sqlite.get('uxlog_config')).toBe('{"jenVLocalStorage":true}')
    expect(local.has('uxlog_data')).toBe(false)
    expect(local.has('uxlog_config')).toBe(false)
    expect(local.get('jina_aplikace')).toBe('nechat')
  })

  it('zápis jde do paměti i do SQLite, smazání z obou', async () => {
    await bridge.writeStoredValue('uxlog_vault_sync', 'x'.repeat(100000))
    expect(sqlite.get('uxlog_vault_sync')).toHaveLength(100000)
    expect(bridge.readStoredValue('uxlog_vault_sync')).toHaveLength(100000)
    await bridge.removeStoredValue('uxlog_vault_sync')
    expect(sqlite.has('uxlog_vault_sync')).toBe(false)
    expect(bridge.readStoredValue('uxlog_vault_sync')).toBeNull()
  })

  it('nepovedený zápis do SQLite se nahlásí volajícímu, zálohuje a po úspěchu záloha zmizí', async () => {
    vi.useFakeTimers()
    const seen = []
    const stop = bridge.onSaveProblemChange((p) => seen.push(p))
    failSave = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(bridge.writeStoredValue('uxlog_data', '{"a":1}')).rejects.toThrow('disk full')
    expect(local.get('uxlog-unsaved:uxlog_data')).toBe('{"a":1}')
    expect(bridge.getSaveProblem()).toMatchObject({ keys: ['uxlog_data'], backedUp: true, error: 'disk full' })

    // Další změna během výpadku: záloha drží nejnovější hodnotu
    await expect(bridge.writeStoredValue('uxlog_data', '{"a":2}')).rejects.toThrow()
    expect(local.get('uxlog-unsaved:uxlog_data')).toBe('{"a":2}')

    // Opakovaný pokus se naplánuje sám; po obnově databáze zapíše nejnovější hodnotu
    failSave = false
    await vi.advanceTimersByTimeAsync(5_000)
    await vi.waitFor(() => expect(sqlite.get('uxlog_data')).toBe('{"a":2}'))
    expect(local.has('uxlog-unsaved:uxlog_data')).toBe(false)
    expect(bridge.getSaveProblem()).toBeNull()
    expect(seen.at(-1)).toBeNull()
    stop()
    vi.useRealTimers()
  })

  it('ruční „Zkusit znovu“ a selhání zálohy (plný localStorage)', async () => {
    failSave = true
    const origSet = localStorage.setItem
    localStorage.setItem = () => { throw new Error('quota') }
    await expect(bridge.writeStoredValue('uxlog_history', '[1]')).rejects.toThrow()
    expect(bridge.getSaveProblem()).toMatchObject({ backedUp: false })
    expect(await bridge.retryFailedWrites()).toBe(false)
    localStorage.setItem = origSet
    failSave = false
    expect(await bridge.retryFailedWrites()).toBe(true)
    expect(sqlite.get('uxlog_history')).toBe('[1]')
    expect(bridge.getSaveProblem()).toBeNull()
  })

  it('hlavní stav se ukládá jen po změněných záznamech', async () => {
    changeBatches.length = 0
    const changes = { upserts: [{ collection: 'goals', record: { id: 'g1' } }], deletes: [{ collection: 'bugs', id: 'b1' }] }
    await bridge.writeAppDataChanges('{"goals":[{"id":"g1"}]}', changes)
    expect(changeBatches).toEqual([changes])
    expect(bridge.readStoredValue('uxlog_data')).toBe('{"goals":[{"id":"g1"}]}')
    // Prázdná dávka do databáze nic neposílá
    await bridge.writeAppDataChanges('{"goals":[{"id":"g1"}]}', { upserts: [], deletes: [] })
    expect(changeBatches).toHaveLength(1)
  })

  it('po selhání změn se opakuje uložení celého stavu', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    failChanges = true
    await expect(bridge.writeAppDataChanges('{"v":1}', { upserts: [{ collection: 'goals', record: { id: 'g' } }], deletes: [] })).rejects.toThrow('db locked')
    expect(bridge.getSaveProblem()?.keys).toEqual(['uxlog_data'])
    expect(local.get('uxlog-unsaved:uxlog_data')).toBe('{"v":1}')
    failChanges = false
    // Dokud trvá problém, další uložení jde celé (databáze nemá všechny změny)
    changeBatches.length = 0
    await bridge.writeAppDataChanges('{"v":2}', { upserts: [{ collection: 'goals', record: { id: 'g' } }], deletes: [] })
    expect(changeBatches).toHaveLength(0)
    expect(sqlite.get('uxlog_data')).toBe('{"v":2}')
    expect(bridge.getSaveProblem()).toBeNull()
    expect(local.has('uxlog-unsaved:uxlog_data')).toBe(false)
  })

  it('změny z lokálního HTTP API se vyzvednou podle revize', async () => {
    externalLog = { revision: 2, changes: [{ revision: 2, collection: 'goals', record: { id: 'g1' } }], reset: false }
    expect(await bridge.fetchExternalChanges(1)).toEqual(externalLog)
    expect(lastSince).toBe(1)
    externalLog = null
    expect(await bridge.fetchExternalChanges(3)).toEqual({ revision: 3, changes: [], reset: false })
  })

  it('při resetu se uxlog_data načte ze SQLite celé', async () => {
    sqlite.set('uxlog_data', '{"projects":["z Figmy"]}')
    expect(await bridge.reloadUxlogDataFromDisk()).toBe(true)
    expect(bridge.readStoredValue('uxlog_data')).toBe('{"projects":["z Figmy"]}')
  })
})
