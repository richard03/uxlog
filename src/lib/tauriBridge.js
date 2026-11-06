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
  'uxlog_history',
  'uxlog_config',
  'uxlog_plugins',
  'uxlog_ai_keys',
  'uxlog_last_save_ts',
  'uxlog_last_api_ts',
  'uxlog_vault',
  'uxlog_vault_sync',
  'uxlog_recognita',
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
 * Uloží soubor na disk přes Tauri invoke (Dokumenty/UXLog) a otevře ho, nebo ukáže ve složce.
 * Ve webovém prostředí použije klasický <a> download.
 * @param {string} filename
 * @param {Uint8Array|ArrayBuffer} data
 * @param {string} mimeType
 * @param {{ reveal?: boolean }} [options] - reveal: ukázat soubor ve správci souborů místo otevření
 * @returns {Promise<string|null>} plná cesta k uloženému souboru (Tauri), ve webu null
 */
export async function saveAndOpenFile(filename, data, mimeType, { reveal = false } = {}) {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core')
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const base64 = uint8ArrayToBase64(bytes)
    const path = await invoke('save_download_file', { filename, dataBase64: base64 })
    // Soubor je uložený – nepovedené otevření (např. chybí aplikace pro typ souboru) export nezmaří
    try {
      await invoke('open_download_file', { path, reveal })
    } catch (err) {
      console.warn('[UXLog] open_download_file failed:', err)
    }
    return path
  } else {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return null
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

// ---------------------------------------------------------------------------
// Vault – data jako složka souborů (jen desktop). Formát a plán zápisu jsou v lib/vault/.
// ---------------------------------------------------------------------------

async function invokeTauri(command, args) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(command, args)
}

/**
 * Výchozí složka vaultu (Dokumenty/UXLog/Data); mimo Tauri ''.
 * @returns {Promise<string>}
 */
export async function vaultDefaultRoot() {
  if (!isTauri) return ''
  return invokeTauri('vault_default_root')
}

/**
 * Seznam spravovaných souborů vaultu s SHA-256 obsahu (logické cesty projects/…, .uxlog/…).
 * @param {string} root
 * @param {string} [layout] - 'shared' (výchozí složka) nebo 'project' (vlastní složka projektu)
 * @returns {Promise<Array<{ path: string, hash: string }>>}
 */
export async function vaultScan(root, layout = 'shared') {
  return invokeTauri('vault_scan', { root, layout })
}

/**
 * Přečte soubor vaultu; neexistující = null.
 * @param {string} root
 * @param {string} path - logická relativní cesta
 * @param {string} [layout]
 * @returns {Promise<string|null>}
 */
export async function vaultReadFile(root, path, layout = 'shared') {
  return invokeTauri('vault_read_file', { root, path, layout })
}

/**
 * Přečte datové soubory vaultu (projects/, .uxlog/) s obsahem – pro načtení změn do aplikace.
 * @param {string} root
 * @param {string} [layout]
 * @returns {Promise<Array<{ path: string, content: string }>>}
 */
export async function vaultReadFiles(root, layout = 'shared') {
  return invokeTauri('vault_read_files', { root, layout })
}

/**
 * Zapíše a smaže soubory vaultu; chyba jednoho souboru nezastaví ostatní.
 * @param {string} root
 * @param {Array<{ path: string, content: string }>} writes
 * @param {string[]} deletes
 * @param {string} [layout]
 * @returns {Promise<{ written: string[], deleted: string[], errors: Array<{ path: string, message: string }> }>}
 */
export async function vaultApply(root, writes, deletes, layout = 'shared') {
  return invokeTauri('vault_apply', { root, writes, deletes, layout })
}

/**
 * Otevře složku vaultu ve správci souborů.
 * @param {string} root
 * @returns {Promise<void>}
 */
export async function vaultOpenRoot(root) {
  return invokeTauri('vault_open_root', { root })
}

/**
 * Nechá uživatele vybrat složku (systémový dialog). Zrušení = null.
 * @param {string} [defaultPath]
 * @returns {Promise<string|null>}
 */
export async function pickDirectory(defaultPath) {
  if (!isTauri) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true, multiple: false, defaultPath: defaultPath || undefined })
  return typeof selected === 'string' ? selected : null
}

/**
 * Nastaví sledované složky vaultu (změny souborů dat hlásí událost uxlog-vault-changed);
 * složky, které v seznamu nejsou, se přestanou sledovat.
 * @param {Array<{ root: string, layout: string }>} targets
 * @returns {Promise<string[]>} chyby jednotlivých složek
 */
export async function vaultWatch(targets) {
  if (!isTauri) return []
  return invokeTauri('vault_watch', { targets })
}

/**
 * Zastaví sledování složky vaultu.
 * @returns {Promise<void>}
 */
export async function vaultUnwatch() {
  if (!isTauri) return
  return invokeTauri('vault_unwatch')
}

/**
 * Přihlásí listener na změny souborů ve sledované složce vaultu.
 * @param {(payload: { root?: string, paths?: string[] }) => void} onChange
 * @returns {Promise<Function>} unsubscribe (mimo Tauri no-op)
 */
export async function listenToVaultChanges(onChange) {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen('uxlog-vault-changed', (event) => {
    try {
      onChange((event && event.payload) || {})
    } catch (err) {
      console.error('[TauriBridge] vault change handler failed:', err)
    }
  })
}

// ---------------------------------------------------------------------------
// Diktování (konektor Recognita) – spojení drží Rust (hlavička Authorization u WebSocketu)
// ---------------------------------------------------------------------------

/**
 * Zahájí diktování; vrací id sezení. Průběh chodí přes listenToDictation.
 * @param {string} url adresa ws/wss živého přepisu
 * @param {string} apiKey
 * @returns {Promise<number>}
 */
export async function dictationStart(url, apiKey) {
  if (!isTauri) throw new Error('unsupported')
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('dictation_start', { url, apiKey })
}

/** Pošle blok zvuku (base64 PCM s16le 16 kHz mono). */
export async function dictationAudio(session, data) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('dictation_audio', { session, data })
}

/** Ukončí nahrávání – server dopřepíše zbytek a pošle done. */
export async function dictationStop(session) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('dictation_stop', { session })
}

/** Okamžitě zavře spojení. */
export async function dictationAbort(session) {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('dictation_abort', { session })
}

/**
 * Přihlásí listener na události diktování ({ session, kind, data?, code?, closeCode? }).
 * @param {(payload: Object) => void} onEvent
 * @returns {Promise<() => void>} odhlášení
 */
export async function listenToDictation(onEvent) {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen('uxlog-dictation', (event) => onEvent(event.payload || {}))
}
