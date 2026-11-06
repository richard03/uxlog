import { describe, it, expect } from 'vitest'
import { normalizeRecognitaSettings, isRecognitaConfigured } from './settings.js'

describe('normalizeRecognitaSettings', () => {
  it('doplní výchozí hodnoty pro chybějící nebo poškozená data', () => {
    expect(normalizeRecognitaSettings(null)).toEqual({ url: '', apiKey: '', language: 'cs', vocabulary: '', enabled: true })
    expect(normalizeRecognitaSettings({ url: 5, apiKey: ['x'], enabled: 'ne' }).enabled).toBe(true)
  })
  it('ořízne mezery, jazyk malými písmeny, prázdný jazyk zůstane (autodetekce)', () => {
    const s = normalizeRecognitaSettings({ url: ' https://h ', apiKey: ' rk_1 ', language: ' EN ', vocabulary: ' UXLog ', enabled: false })
    expect(s).toEqual({ url: 'https://h', apiKey: 'rk_1', language: 'en', vocabulary: 'UXLog', enabled: false })
    expect(normalizeRecognitaSettings({ language: '' }).language).toBe('')
  })
})

describe('isRecognitaConfigured', () => {
  it('vyžaduje zapnutí, platnou adresu a klíč', () => {
    expect(isRecognitaConfigured({ enabled: true, url: 'https://h:9443', apiKey: 'rk_1' })).toBe(true)
    expect(isRecognitaConfigured({ enabled: false, url: 'https://h', apiKey: 'rk_1' })).toBe(false)
    expect(isRecognitaConfigured({ enabled: true, url: '', apiKey: 'rk_1' })).toBe(false)
    expect(isRecognitaConfigured({ enabled: true, url: 'https://h', apiKey: '' })).toBe(false)
    expect(isRecognitaConfigured(undefined)).toBe(false)
  })
})
