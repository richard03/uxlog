/**
 * Sdílená správa API klíčů pro AI služby.
 * Oba pluginy (Gemini, OpenAI) sdílejí stejný klíč úložiště.
 * Klíče nejsou součástí exportu dat.
 * V Tauri prostředí se zrcadlí do souborů přes tauriBridge.
 */

import { readStoredValue, writeStoredValue } from '../../tauriBridge.js'

const STORAGE_KEY = 'uxlog_ai_keys'

/**
 * Načte API klíče z úložiště aplikace.
 * @returns {Object} Mapa { serviceId: apiKey, serviceId_model: model, ... }
 */
export function loadAiKeys() {
  try {
    const raw = readStoredValue(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    console.error('loadAiKeys failed:', e)
    return {}
  }
}

/**
 * Uloží API klíče do úložiště aplikace (SQLite).
 * @param {Object} keys
 */
export function saveAiKeys(keys) {
  try {
    writeStoredValue(STORAGE_KEY, JSON.stringify(keys)).catch(() => {})
  } catch (e) {
    console.error('saveAiKeys failed:', e)
  }
}

/**
 * Vrátí API klíč pro konkrétní službu.
 * @param {string} serviceId
 * @returns {string}
 */
export function getAiKey(serviceId) {
  return loadAiKeys()[serviceId] ?? ''
}

/**
 * Nastaví API klíč pro konkrétní službu.
 * @param {string} serviceId
 * @param {string} apiKey
 */
export function setAiKey(serviceId, apiKey) {
  const keys = loadAiKeys()
  keys[serviceId] = apiKey
  saveAiKeys(keys)
}

/**
 * Vrátí, zda je AI služba povolena.
 * @param {string} serviceId
 * @returns {boolean}
 */
export function isAiServiceEnabled(serviceId) {
  return loadAiKeys()[`${serviceId}_enabled`] !== false
}

/**
 * Nastaví stav povolení AI služby.
 * @param {string} serviceId
 * @param {boolean} enabled
 */
export function setAiServiceEnabled(serviceId, enabled) {
  const keys = loadAiKeys()
  keys[`${serviceId}_enabled`] = enabled
  saveAiKeys(keys)
}
