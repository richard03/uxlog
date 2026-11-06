/**
 * Tauri bridge – detekce prostředí a úložiště aplikace.
 *
 * UXLog je jen desktopová aplikace. Všechna uložená data (stav, historie, konfigurace, nastavení
 * konektorů…) jsou v SQLite (Rust `storage.rs`). Při startu se načtou najednou do paměti
 * (`initStorage`), čte se synchronně z paměti (`readStoredValue`) a každý zápis jde rovnou
 * do SQLite (`writeStoredValue`). localStorage se nepoužívá – jen při prvním startu nové verze se
 * z něj jednorázově převezme, co v SQLite chybí, a pak se vyčistí.
 *
 * Mimo Tauri (testy, náhled `npm run dev` v prohlížeči) je úložiště jen v paměti a po obnovení
 * stránky se ztratí.
 */

/** Vrátí true, pokud aplikace běží uvnitř Tauri WebView (v2). */
export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Klíče aplikace (prefix) – podle něj se při migraci přebírá a čistí localStorage. */
const KEY_PREFIX = 'uxlog_'

/**
 * Hodnoty uložených klíčů v paměti (zrcadlo SQLite).
 * @type {Map<string, string>}
 */
const values = new Map()

let initialized = false
let writesInFlight = 0

/** Probíhá zápis do SQLite? (kontrola externích změn ho počká) */
export function isMirrorInFlight() { return writesInFlight > 0 }

async function invokeCmd(cmd, args) {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(cmd, args)
}

/**
 * Načte úložiště do paměti. Volá se z main.js před načtením storů a pluginů – moduly, které
 * čtou nastavení už při importu, proto vždy vidí data ze SQLite.
 * Jednorázová migrace: klíče aplikace z localStorage (starší verze), které SQLite nemá, se do něj
 * zapíšou; localStorage se pak od klíčů aplikace vyčistí. Kde SQLite hodnotu má, platí SQLite.
 * @returns {Promise<void>}
 */
export async function initStorage() {
  if (initialized) return
  initialized = true
  if (!isTauri) return
  const stored = (await invokeCmd('load_all_storage')) || {}
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === 'string') values.set(key, value)
  }
  await migrateFromLocalStorage()
}

async function migrateFromLocalStorage() {
  let ls
  try {
    ls = window.localStorage
  } catch {
    return
  }
  if (!ls) return
  const keys = []
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i)
    if (key && key.startsWith(KEY_PREFIX)) keys.push(key)
  }
  if (!keys.length) return
  let failed = false
  for (const key of keys) {
    if (values.has(key)) continue
    const value = ls.getItem(key)
    if (value == null) continue
    try {
      await invokeCmd('save_storage', { key, value })
      values.set(key, value)
      console.log(`[Storage] převzato z localStorage: ${key}`)
    } catch (err) {
      failed = true
      console.error(`[Storage] převzetí ${key} z localStorage selhalo:`, err)
    }
  }
  // Vyčistit jen po úspěšném převzetí – jinak to zkusí příští start
  if (!failed) {
    for (const key of keys) {
      try { ls.removeItem(key) } catch { /* nic */ }
    }
  }
}

/**
 * Přečte uloženou hodnotu klíče.
 * @param {string} key
 * @returns {string|null}
 */
export function readStoredValue(key) {
  return values.has(key) ? values.get(key) : null
}

/**
 * Uloží hodnotu klíče (paměť + SQLite). Promise se odmítne, když se zápis do SQLite nepovede.
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function writeStoredValue(key, value) {
  values.set(key, value)
  if (!isTauri) return
  writesInFlight++
  try {
    await invokeCmd('save_storage', { key, value })
  } catch (err) {
    console.error(`[Storage] zápis ${key} selhal:`, err)
    throw err
  } finally {
    writesInFlight--
  }
}

/**
 * Smaže uložený klíč.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeStoredValue(key) {
  values.delete(key)
  if (!isTauri) return
  try {
    await invokeCmd('remove_storage', { key })
  } catch (err) {
    console.error(`[Storage] smazání ${key} selhalo:`, err)
  }
}

/**
 * Porovná `uxlog_data` v paměti s SQLite (změny přes lokální HTTP API, např. z Figmy).
 * Při rozdílu převezme hodnotu ze SQLite a vrátí true — volající pak obnoví Vue state.
 * @returns {Promise<boolean>}
 */
export async function pullUxlogDataFromDiskIntoApp() {
  if (!isTauri) return false
  const fromDisk = await invokeCmd('load_storage', { key: 'uxlog_data' })
  if (fromDisk == null) return false
  if (fromDisk === (values.get('uxlog_data') ?? '')) return false
  values.set('uxlog_data', fromDisk)
  return true
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
