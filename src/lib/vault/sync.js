/**
 * Vault – plán zápisu dat aplikace do složky (aplikace → soubory).
 *
 * Aplikace si v manifestu (.uxlog/manifest.json) pamatuje hash každého souboru, který zapsala.
 * Podle něj pozná, že soubor mezitím změnil někdo jiný (Claude, uživatel), a takový soubor
 * nepřepíše ani nesmaže – nahlásí konflikt. Soubory, které aplikace nikdy nezapsala a nechce
 * zapsat, nechá být.
 *
 * Čisté funkce (kromě hashText, který jen počítá SHA-256 přes Web Crypto).
 */

import { normalizeVaultPath, META_DIR } from './paths.js'

/** Manifest zapsaných souborů (spravuje aplikace, do plánu se nezahrnuje). */
export const MANIFEST_FILE = `${META_DIR}/manifest.json`
export const MANIFEST_VERSION = 1

/** Důvody konfliktu. */
export const CONFLICT = Object.freeze({
  /** Soubor zapsaný aplikací se mezitím změnil mimo aplikaci. */
  MODIFIED: 'modifiedExternally',
  /** Na místě, kam chce aplikace zapsat, je cizí soubor (aplikace ho nezapsala). */
  UNKNOWN: 'unknownFile',
  /** Soubor, který už aplikace nepotřebuje (entita smazána/přejmenována), byl mimo aplikaci změněn. */
  STALE_MODIFIED: 'staleModified',
  /** Soubor zapsaný aplikací někdo smazal (aplikace ho znovu nevytvoří – smazání je změna k načtení). */
  DELETED: 'deletedExternally',
})

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * SHA-256 textu (UTF-8) jako hex – stejně jako hash souboru v Rustu (vault::scan).
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function hashText(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Přečte manifest; poškozený nebo chybějící = prázdný.
 * @param {unknown} text
 * @returns {Object.<string, string>} cesta → hash
 */
export function parseManifest(text) {
  try {
    const data = JSON.parse(String(text ?? ''))
    const files = isObject(data?.files) ? data.files : {}
    const out = {}
    for (const [path, hash] of Object.entries(files)) {
      if (typeof hash === 'string' && hash) out[normalizeVaultPath(path)] = hash
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Přečte z manifestu značku synchronizace (syncId) – náhodné id posledního zápisu aplikace.
 * Databáze aplikace si pamatuje syncId, které sama zapsala; když se liší, složku mezitím zapsal
 * někdo jiný (jiný počítač, obnovená záloha) a databáze se musí sestavit znovu ze složky.
 * @param {unknown} text
 * @returns {string|null} null = manifest chybí, je poškozený nebo je ze starší verze bez značky
 */
export function parseManifestSyncId(text) {
  try {
    const data = JSON.parse(String(text ?? ''))
    return typeof data?.syncId === 'string' && data.syncId ? data.syncId : null
  } catch {
    return null
  }
}

/**
 * Serializuje manifest (seřazené cesty kvůli stabilnímu obsahu).
 * @param {Object.<string, string>} manifest
 * @param {string|null} [syncId] - značka synchronizace (viz parseManifestSyncId)
 * @returns {string}
 */
export function serializeManifest(manifest, syncId = null) {
  const files = {}
  for (const path of Object.keys(manifest ?? {}).sort()) files[path] = manifest[path]
  const data = typeof syncId === 'string' && syncId
    ? { version: MANIFEST_VERSION, syncId, files }
    : { version: MANIFEST_VERSION, files }
  return `${JSON.stringify(data, null, 2)}\n`
}

/**
 * Naplánuje zápis: co zapsat, co smazat, co je v konfliktu, a nový manifest.
 *
 * Pro každý požadovaný soubor (hash H, na disku D, v manifestu M):
 *   D chybí a M chybí → zapsat;  D chybí a M je → konflikt DELETED (smazáno mimo aplikaci);
 *   D = H → beze změny;  D = M → zapsat (soubor je náš a nezměněný);
 *   jinak konflikt (MODIFIED, je-li v manifestu, jinak UNKNOWN) – kromě cest ve `force` (zapsat).
 * Soubor s `createOnly` (např. CLAUDE.md, který si uživatel upravuje) se zapíše jen, když na disku
 *   chybí; jinak se nechá být, nikdy není konfliktem a do manifestu se nezapisuje.
 * Pro soubor z manifestu, který už požadovaný není:
 *   D chybí → jen vypustit z manifestu;  D = M → smazat;  jinak konflikt STALE_MODIFIED
 *   (soubor zůstane, z manifestu vypadne – dál je to cizí soubor), kromě cest ve `force` (smazat).
 *
 * @param {{
 *   desired: Array<{ path: string, content: string, hash: string, createOnly?: boolean }>,
 *   disk: Array<{ path: string, hash: string }>|Object.<string, string>,
 *   manifest: Object.<string, string>,
 *   force?: Iterable<string>,
 * }} input
 * @returns {{
 *   writes: Array<{ path: string, content: string, hash: string }>,
 *   deletes: string[],
 *   conflicts: Array<{ path: string, reason: string }>,
 *   unchanged: number,
 *   manifest: Object.<string, string>,
 * }}
 */
export function planVaultWrite({ desired, disk, manifest, force = [] }) {
  const diskMap = new Map(
    Array.isArray(disk)
      ? disk.filter((f) => f && typeof f.path === 'string').map((f) => [normalizeVaultPath(f.path), f.hash])
      : Object.entries(disk ?? {}).map(([p, h]) => [normalizeVaultPath(p), h]),
  )
  const oldManifest = isObject(manifest) ? manifest : {}
  const forced = new Set([...force].map(normalizeVaultPath))
  const writes = []
  const deletes = []
  const conflicts = []
  const nextManifest = {}
  const desiredPaths = new Set()
  let unchanged = 0

  for (const file of Array.isArray(desired) ? desired : []) {
    const path = normalizeVaultPath(file?.path)
    if (!path || path === MANIFEST_FILE || desiredPaths.has(path)) continue
    desiredPaths.add(path)
    const onDisk = diskMap.get(path)
    const known = oldManifest[path]
    if (file.createOnly) {
      if (onDisk === undefined) writes.push({ path, content: file.content, hash: file.hash })
      else unchanged++
    } else if (onDisk === file.hash) {
      unchanged++
      nextManifest[path] = file.hash
    } else if (onDisk === undefined && known && !forced.has(path)) {
      conflicts.push({ path, reason: CONFLICT.DELETED })
      nextManifest[path] = known
    } else if (onDisk === undefined || onDisk === known || forced.has(path)) {
      writes.push({ path, content: file.content, hash: file.hash })
      nextManifest[path] = file.hash
    } else {
      conflicts.push({ path, reason: known ? CONFLICT.MODIFIED : CONFLICT.UNKNOWN })
      if (known) nextManifest[path] = known
    }
  }

  for (const [rawPath, known] of Object.entries(oldManifest)) {
    const path = normalizeVaultPath(rawPath)
    if (desiredPaths.has(path) || path === MANIFEST_FILE) continue
    const onDisk = diskMap.get(path)
    if (onDisk === undefined) continue
    if (onDisk === known || forced.has(path)) deletes.push(path)
    else conflicts.push({ path, reason: CONFLICT.STALE_MODIFIED })
  }

  conflicts.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return { writes, deletes, conflicts, unchanged, manifest: nextManifest }
}

/**
 * Upraví plánovaný manifest podle skutečného výsledku zápisu: soubor, který se nepodařilo
 * zapsat, zůstane s původním hashem (nebo vypadne), nesmazaný soubor zůstane v manifestu.
 * @param {Object.<string, string>} planned - manifest z planVaultWrite
 * @param {Object.<string, string>} previous - manifest před zápisem
 * @param {{ errors?: Array<{ path: string }> }} applyResult
 * @param {string[]} deletes - plánovaná mazání
 * @returns {Object.<string, string>}
 */
export function reconcileManifest(planned, previous, applyResult, deletes = []) {
  const out = { ...(planned ?? {}) }
  const failed = new Set((applyResult?.errors ?? []).map((e) => normalizeVaultPath(e?.path)))
  for (const path of failed) {
    if (deletes.includes(path)) {
      if (previous?.[path]) out[path] = previous[path]
    } else if (previous?.[path]) {
      out[path] = previous[path]
    } else {
      delete out[path]
    }
  }
  return out
}

/**
 * Přijme aktuální obsah souborů na disku jako „známý“ (po načtení změn do aplikace):
 * do manifestu zapíše jejich hash z disku, smazané soubory z manifestu vypustí.
 * Další zápis je pak bere jako soubory aplikace a přepíše je kanonickou podobou (nebo smaže).
 * @param {Object.<string, string>} manifest
 * @param {Array<{ path: string, hash: string }>} disk
 * @param {string[]} paths
 * @returns {Object.<string, string>}
 */
export function acceptPaths(manifest, disk, paths) {
  const out = { ...(manifest ?? {}) }
  const diskMap = new Map((Array.isArray(disk) ? disk : []).map((f) => [normalizeVaultPath(f?.path), f?.hash]))
  for (const raw of paths ?? []) {
    const path = normalizeVaultPath(raw)
    const hash = diskMap.get(path)
    if (hash) out[path] = hash
    else delete out[path]
  }
  return out
}

/** Snímky záznamů z doby poslední shody aplikace se souborem (základ pro trojcestné slučování). */
export const BASE_FILE = `${META_DIR}/base.json`

/** Pole projektu, která se do základu neukládají (nejsou v souborech). */
const BASE_EXCLUDED_PROJECT_FIELDS = ['canvas', 'notebookHistory', 'config']

/**
 * Klíč záznamu v základu: „kolekce:id“, souvislosti projektu „connections:projectId“.
 * @param {{ collection: string, id: string|null, projectId?: string }} info
 * @returns {string}
 */
export function baseKey(info) {
  return info.collection === 'connections' ? `connections:${info.projectId}` : `${info.collection}:${info.id}`
}

/**
 * Přečte základ; poškozený nebo chybějící = prázdný.
 * @param {unknown} text
 * @returns {Object.<string, unknown>}
 */
export function parseBase(text) {
  try {
    const data = JSON.parse(String(text ?? ''))
    return isObject(data?.records) ? data.records : {}
  } catch {
    return {}
  }
}

/**
 * Serializuje základ (seřazené klíče kvůli stabilnímu obsahu).
 * @param {Object.<string, unknown>} records
 * @returns {string}
 */
export function serializeBase(records) {
  const sorted = {}
  for (const key of Object.keys(records ?? {}).sort()) sorted[key] = records[key]
  return `${JSON.stringify({ version: 1, records: sorted })}\n`
}

/**
 * Nový základ po zápisu: záznamy, jejichž soubor je teď v souladu s aplikací (hash v manifestu
 * = hash požadovaného obsahu), dostanou snímek ze stavu aplikace. Záznamy se souborem v konfliktu
 * si ponechají předchozí základ, ostatní (smazané) vypadnou.
 * @param {{
 *   previous: Object.<string, unknown>,
 *   index: Object.<string, { collection: string, id: string|null, projectId: string }>,  z buildVaultFiles
 *   desired: Array<{ path: string, hash: string }>,
 *   manifest: Object.<string, string>,                                                  manifest po zápisu
 *   state: Object,
 * }} input
 * @returns {Object.<string, unknown>}
 */
export function buildBaseSnapshot({ previous = {}, index = {}, desired = [], manifest = {}, state = {} }) {
  const hashByPath = new Map(desired.map((f) => [normalizeVaultPath(f.path), f.hash]))
  const out = {}
  for (const [rawPath, info] of Object.entries(index)) {
    const path = normalizeVaultPath(rawPath)
    const key = baseKey(info)
    const inSync = manifest[path] && manifest[path] === hashByPath.get(path)
    if (!inSync) {
      if (key in previous) out[key] = previous[key]
      continue
    }
    if (info.collection === 'connections') {
      out[key] = (state.connections ?? []).filter((c) => c?.projectId === info.projectId).map((c) => JSON.parse(JSON.stringify(c)))
      continue
    }
    const record = (state[info.collection] ?? []).find((r) => r?.id === info.id)
    if (!record) continue
    const snapshot = JSON.parse(JSON.stringify(record))
    if (info.collection === 'projects') for (const f of BASE_EXCLUDED_PROJECT_FIELDS) delete snapshot[f]
    out[key] = snapshot
  }
  return out
}
