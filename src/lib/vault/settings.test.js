import { describe, it, expect } from 'vitest'
import {
  normalizeVaultSettings, parseVaultSettings, DEFAULT_VAULT_SETTINGS, normalizeProjectVaultSetting, withProjectVaultSetting,
} from './settings.js'

describe('nastavení vaultu', () => {
  it('normalizuje platné hodnoty a ořízne cestu', () => {
    expect(normalizeVaultSettings({ enabled: true, root: '  C:\\Data  ', extra: 1 })).toEqual({ enabled: true, root: 'C:\\Data', projects: {} })
  })

  it('poškozená data → výchozí hodnoty', () => {
    expect(normalizeVaultSettings({ enabled: 'ano', root: 5 })).toEqual(DEFAULT_VAULT_SETTINGS)
    expect(normalizeVaultSettings({ autoImport: false })).toEqual(DEFAULT_VAULT_SETTINGS) // zrušené nastavení se zahodí
    expect(normalizeVaultSettings(null)).toEqual(DEFAULT_VAULT_SETTINGS)
    expect(normalizeVaultSettings([])).toEqual(DEFAULT_VAULT_SETTINGS)
    expect(parseVaultSettings('{neplatný')).toEqual(DEFAULT_VAULT_SETTINGS)
    expect(parseVaultSettings(null)).toEqual(DEFAULT_VAULT_SETTINGS)
  })

  it('přečte uložený JSON', () => {
    expect(parseVaultSettings('{"enabled":true,"root":"/data"}')).toEqual({ enabled: true, root: '/data', projects: {} })
  })

  it('složky projektů: vlastní složka, vyřazení, neplatné položky vypustí', () => {
    const s = normalizeVaultSettings({ projects: { a: { root: ' D:\\Repo ' }, b: { off: true }, c: { root: '' }, d: 'x', e: null } })
    expect(s.projects).toEqual({ a: { root: 'D:\\Repo' }, b: { off: true } })
    expect(normalizeProjectVaultSetting({ off: true, root: 'X' })).toEqual({ off: true })
    expect(normalizeProjectVaultSetting(undefined)).toBeNull()
  })

  it('withProjectVaultSetting nastaví a zruší složku projektu bez změny vstupu', () => {
    const base = { enabled: true, root: 'C:\\Data', projects: { a: { off: true } } }
    const next = withProjectVaultSetting(base, 'b', { root: 'D:\\B' })
    expect(next.projects).toEqual({ a: { off: true }, b: { root: 'D:\\B' } })
    expect(base.projects).toEqual({ a: { off: true } })
    expect(withProjectVaultSetting(next, 'a', null).projects).toEqual({ b: { root: 'D:\\B' } })
  })
})
