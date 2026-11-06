import { describe, it, expect, vi } from 'vitest'

// Prostředí Tauri: SQLite backend v paměti, starý localStorage z předchozí verze
const sqlite = new Map()
let failSave = false
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd, args) => {
    if (cmd === 'load_all_storage') return Object.fromEntries(sqlite)
    if (cmd === 'save_storage') {
      if (failSave) throw new Error('disk full')
      sqlite.set(args.key, args.value)
    }
    if (cmd === 'remove_storage') sqlite.delete(args.key)
    if (cmd === 'load_storage') return sqlite.has(args.key) ? sqlite.get(args.key) : null
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

  it('nepovedený zápis do SQLite se nahlásí volajícímu', async () => {
    failSave = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(bridge.writeStoredValue('uxlog_data', '{}')).rejects.toThrow('disk full')
    failSave = false
  })

  it('změna dat zvenku (lokální HTTP API) se pozná a převezme', async () => {
    sqlite.set('uxlog_data', '{"projects":["z Figmy"]}')
    expect(await bridge.pullUxlogDataFromDiskIntoApp()).toBe(true)
    expect(bridge.readStoredValue('uxlog_data')).toBe('{"projects":["z Figmy"]}')
    expect(await bridge.pullUxlogDataFromDiskIntoApp()).toBe(false)
  })
})
