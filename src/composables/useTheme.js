/**
 * Vzhled aplikace: „dark“ (výchozí moderní), „amiga“ (Workbench 1.3), „macos“ (světlý, ve stylu macOS),
 * „pixelart“ (8bitová pixelová grafika) nebo „scifi“ (futuristický HUD).
 * Volba je uložená v úložišti aplikace (`uxlog_theme`), na <html> se nastaví atribut data-theme.
 */

import { ref } from 'vue'
import { readStoredValue, writeStoredValue } from '../lib/tauriBridge.js'

const STORAGE_KEY = 'uxlog_theme'
export const THEMES = ['dark', 'amiga', 'macos', 'pixelart', 'scifi']

const theme = ref('dark')

function apply(value) {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', value)
}

/** Načte uložený vzhled a nastaví ho (volá se při startu, před vykreslením). */
export function initTheme() {
  const stored = readStoredValue(STORAGE_KEY)
  theme.value = THEMES.includes(stored) ? stored : 'dark'
  apply(theme.value)
}

export function useTheme() {
  function setTheme(value) {
    const next = THEMES.includes(value) ? value : 'dark'
    theme.value = next
    apply(next)
    writeStoredValue(STORAGE_KEY, next).catch(() => {})
  }
  return { theme, themes: THEMES, setTheme }
}
