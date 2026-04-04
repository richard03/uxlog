/**
 * Tauri bridge – detekce prostředí a zrcadlení localStorage do nativního storage.
 *
 * V Tauri WebView localStorage funguje, ale data nejsou dostupná pro
 * lokální HTTP server (Figma plugin). Tento modul zrcadlí každý zápis
 * do SQLite backendu přes Tauri invoke a při startu obnoví localStorage z něj,
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
 * Uloží hodnotu do nativního storage přes Tauri IPC.
 * Vrací Promise, aby volající mohl čekat na dokončení zápisu.
 * @param {string} key  Klíč localStorage
 * @param {string} value  Serializovaná hodnota (JSON string nebo plain string)
 * @returns {Promise<void>}
 */
let _mirrorInFlight = 0
export function isMirrorInFlight() { return _mirrorInFlight > 0 }

export async function mirrorToTauri(key, value) {
  if (!isTauri) return
  _mirrorInFlight++
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('save_storage', { key, value })
  } catch (err) {
    console.error('[TauriBridge] mirrorToTauri failed:', err)
  } finally {
    _mirrorInFlight--
  }
}

/**
 * Načte hodnotu z nativního storage přes Tauri IPC.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function loadFromTauri(key) {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('load_storage', { key })
}

/**
 * Znovu načte konkrétní klíč z nativního storage a přepíše jím localStorage.
 * Vrací načtenou hodnotu, nebo null pokud neexistuje.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function reloadKeyFromTauri(key) {
  const value = await loadFromTauri(key)
  if (value == null) {
    localStorage.removeItem(key)
    return null
  }
  localStorage.setItem(key, value)
  return value
}

/**
 * Porovná `uxlog_data` v localStorage s nativním storage backendem.
 * Při rozdílu přepíše localStorage a vrátí true — volající pak může obnovit Vue state.
 * @returns {Promise<boolean>}
 */
export async function pullUxlogDataFromDiskIntoApp() {
  if (!isTauri) return false
  const { invoke } = await import('@tauri-apps/api/core')
  const fromDisk = await invoke('load_storage', { key: 'uxlog_data' })
  if (fromDisk == null) return false
  const cur = localStorage.getItem('uxlog_data') ?? ''
  if (fromDisk === cur) return false
  localStorage.setItem('uxlog_data', fromDisk)
  return true
}

/**
 * Při startu Tauri aplikace obnoví chybějící klíče v localStorage z nativního storage.
 * Pokud storage backend ještě neobsahuje hodnotu, ale localStorage ano,
 * seedne backend z lokální hodnoty kvůli migraci starších instalací.
 * Volá se z main.js PŘED inicializací storů.
 */
export async function restoreAllFromTauri() {
  if (!isTauri) return
  for (const key of MIRRORED_KEYS) {
    const existing = localStorage.getItem(key)
    try {
      const value = await loadFromTauri(key)
      if (value != null) {
        if (existing) continue
        localStorage.setItem(key, value)
        console.log(`[TauriBridge] Obnoveno z nativního storage: ${key}`)
        continue
      }
      if (existing) {
        await mirrorToTauri(key, existing)
        console.log(`[TauriBridge] Seednuto do nativního storage: ${key}`)
      }
    } catch (err) {
      console.warn(`[TauriBridge] Nelze obnovit ${key}:`, err)
    }
  }
}

/**
 * Otevře URL v externím prohlížeči (Tauri) nebo v novém tabu (web).
 * @param {string} url
 */
export async function openExternal(url) {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Uloží soubor na disk přes Tauri invoke a otevře ho.
 * Ve webovém prostředí použije klasický <a> download.
 * @param {string} filename
 * @param {Uint8Array|ArrayBuffer} data
 * @param {string} mimeType
 */
export async function saveAndOpenFile(filename, data, mimeType) {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core')
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const base64 = uint8ArrayToBase64(bytes)
    const path = await invoke('save_download_file', { filename, dataBase64: base64 })
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(path)
  } else {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

/** Uint8Array → base64 string (bezpečné i pro velké soubory). */
function uint8ArrayToBase64(bytes) {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Přihlásí listener na externí změny storage z Tauri backendu.
 * Vrací unsubscribe funkci, nebo no-op mimo Tauri.
 * @param {(payload: { key?: string }) => void} onChange
 * @returns {Promise<Function>}
 */
export async function listenToTauriStorageUpdates(onChange) {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen('uxlog-storage-updated', (event) => {
    try {
      onChange((event && event.payload) || {})
    } catch (err) {
      console.error('[TauriBridge] storage update handler failed:', err)
    }
  })
}
