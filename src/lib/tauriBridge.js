/**
 * Tauri bridge – detekce prostředí a zrcadlení localStorage do souborů.
 *
 * V Tauri WebView localStorage funguje, ale data nejsou dostupná pro
 * lokální HTTP server (Figma plugin). Tento modul zrcadlí každý zápis
 * do souboru přes Tauri invoke a při startu obnoví localStorage ze souborů,
 * pokud je prázdný (první spuštění, vymazaná cache).
 */

/** Vrátí true, pokud aplikace běží uvnitř Tauri WebView (v2). */
export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Klíče localStorage, které se zrcadlí do Tauri souborů.
 * Flexi-related klíče záměrně vynecháváme (deprecated).
 */
const MIRRORED_KEYS = [
  'uxlog_data',
  'uxlog_config',
  'uxlog_plugins',
  'uxlog_ai_keys',
  'uxlog_last_save_ts',
  'uxlog_last_api_ts',
]

/**
 * Uloží hodnotu do souboru přes Tauri IPC (fire-and-forget).
 * @param {string} key  Klíč localStorage
 * @param {string} value  Serializovaná hodnota (JSON string nebo plain string)
 */
export function mirrorToTauri(key, value) {
  if (!isTauri) return
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke('save_storage', { key, value }))
    .catch((err) => console.error('[TauriBridge] mirrorToTauri failed:', err))
}

/**
 * Načte hodnotu ze souboru přes Tauri IPC.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function loadFromTauri(key) {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('load_storage', { key })
}

/**
 * Při startu Tauri aplikace obnoví chybějící klíče v localStorage ze souborů.
 * Volá se z main.js PŘED inicializací storů.
 */
export async function restoreAllFromTauri() {
  if (!isTauri) return
  for (const key of MIRRORED_KEYS) {
    const existing = localStorage.getItem(key)
    if (existing) continue
    try {
      const value = await loadFromTauri(key)
      if (value != null) {
        localStorage.setItem(key, value)
        console.log(`[TauriBridge] Obnoveno z disku: ${key}`)
      }
    } catch (err) {
      console.warn(`[TauriBridge] Nelze obnovit ${key}:`, err)
    }
  }
}
