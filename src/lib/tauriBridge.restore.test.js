import { describe, it, expect, vi } from 'vitest'

// Start po předchozím výpadku: v localStorage zůstala nouzová záloha novější než SQLite
const sqlite = new Map([['uxlog_data', '{"projects":["staré"]}']])
let failSave = false
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd, args) => {
    if (cmd === 'load_all_storage') return Object.fromEntries(sqlite)
    if (cmd === 'save_storage') {
      if (failSave) throw new Error('locked')
      sqlite.set(args.key, args.value)
    }
    return null
  }),
}))

const local = new Map([
  ['uxlog-unsaved:uxlog_data', '{"projects":["neuložené"]}'],
  ['uxlog-unsaved:cizi', 'nechat'],
])
globalThis.window = {
  __TAURI_INTERNALS__: {},
  localStorage: {
    get length() { return local.size },
    key: (i) => [...local.keys()][i] ?? null,
    getItem: (k) => (local.has(k) ? local.get(k) : null),
    setItem: (k, v) => local.set(k, String(v)),
    removeItem: (k) => local.delete(k),
  },
}

const bridge = await import('./tauriBridge.js')
await bridge.initStorage()

describe('obnova neuložených změn při startu', () => {
  it('převezme zálohu, zapíše ji do SQLite a smaže', () => {
    expect(bridge.readStoredValue('uxlog_data')).toBe('{"projects":["neuložené"]}')
    expect(sqlite.get('uxlog_data')).toBe('{"projects":["neuložené"]}')
    expect(local.has('uxlog-unsaved:uxlog_data')).toBe(false)
    expect(local.get('uxlog-unsaved:cizi')).toBe('nechat')
    expect(bridge.getSaveProblem()).toBeNull()
  })

  it('obnovené klíče oznámí jednou', () => {
    expect(bridge.takeRestoredKeys()).toEqual(['uxlog_data'])
    expect(bridge.takeRestoredKeys()).toEqual([])
  })
})
