/**
 * Sdílená správa API klíčů pro AI služby.
 * Oba pluginy (Gemini, OpenAI) sdílejí stejný localStorage klíč.
 * Klíče nejsou součástí exportu dat.
 */

const STORAGE_KEY = 'uxlog_ai_keys'

/**
 * Načte API klíče z localStorage.
 * @returns {Object} Mapa { serviceId: apiKey, serviceId_model: model, ... }
 */
export function loadAiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    console.error('loadAiKeys failed:', e)
    return {}
  }
}

/**
 * Uloží API klíče do localStorage.
 * @param {Object} keys
 */
export function saveAiKeys(keys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
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
