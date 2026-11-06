/**
 * Nastavení konektoru Recognita (diktování). Uloženo jen v tomto počítači
 * (localStorage `uxlog_recognita`, v Tauri zrcadlené do SQLite); není součástí exportu dat.
 */

import { ref } from 'vue'
import { mirrorToTauri } from '../../tauriBridge.js'
import { normalizeBaseUrl } from '../../dictation.js'

const STORAGE_KEY = 'uxlog_recognita'

/**
 * Normalizuje uložené nastavení (tolerantní ke starým/poškozeným datům).
 * @param {unknown} raw
 * @returns {{ url: string, apiKey: string, language: string, vocabulary: string, enabled: boolean }}
 */
export function normalizeRecognitaSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const s = (v) => (typeof v === 'string' ? v.trim() : '')
  return {
    url: s(r.url),
    apiKey: s(r.apiKey),
    language: typeof r.language === 'string' ? r.language.trim().toLowerCase() : 'cs',
    vocabulary: s(r.vocabulary),
    enabled: r.enabled !== false,
  }
}

/**
 * Je konektor připravený k použití (zapnutý, platná adresa a klíč)?
 * @param {ReturnType<typeof normalizeRecognitaSettings>} settings
 * @returns {boolean}
 */
export function isRecognitaConfigured(settings) {
  return !!(settings?.enabled && settings.apiKey && normalizeBaseUrl(settings.url))
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalizeRecognitaSettings(raw ? JSON.parse(raw) : {})
  } catch {
    return normalizeRecognitaSettings({})
  }
}

/** Reaktivní nastavení – UI podle něj ukazuje nebo skrývá tlačítko diktování. */
export const recognitaSettings = ref(readStored())

/** @returns {ReturnType<typeof normalizeRecognitaSettings>} */
export function loadRecognitaSettings() {
  return { ...recognitaSettings.value }
}

/**
 * Uloží nastavení (sloučí se stávajícím).
 * @param {Partial<ReturnType<typeof normalizeRecognitaSettings>>} patch
 * @returns {ReturnType<typeof normalizeRecognitaSettings>}
 */
export function saveRecognitaSettings(patch) {
  const next = normalizeRecognitaSettings({ ...recognitaSettings.value, ...(patch || {}) })
  recognitaSettings.value = next
  try {
    const json = JSON.stringify(next)
    localStorage.setItem(STORAGE_KEY, json)
    mirrorToTauri(STORAGE_KEY, json)
  } catch (e) {
    console.error('[Recognita] saveRecognitaSettings failed:', e)
  }
  return next
}

/** Znovu načte nastavení z localStorage (po obnově z Tauri při startu). */
export function reloadRecognitaSettings() {
  recognitaSettings.value = readStored()
}
