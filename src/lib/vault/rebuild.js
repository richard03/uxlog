/**
 * Vault – složka dat jako zdroj pravdy, databáze aplikace jako mezipaměť.
 *
 * Databáze (SQLite) si pro každou složku pamatuje značku synchronizace (syncId),
 * kterou naposledy sama zapsala do jejího manifestu. Před každým zápisem se značky porovnají:
 *   shodné                       → databáze je se složkou v souladu (nanejvýš má novější úpravy)
 *   složka bez projektů          → první zápis: data aplikace se do složky zapíší (SEED)
 *   starší instalace bez značek  → pokračuje se jako dřív, značka se doplní zápisem (LEGACY)
 *   jinak                        → databáze se sestaví znovu ze složky (REBUILD) – složku mezitím
 *                                  zapsal jiný počítač, databáze je obnovená ze zálohy nebo prázdná
 *
 * Čisté funkce bez side effects.
 */

import { generateNextCode } from '../code.js'
import { collectionInfo, normalizeVaultPath, rootKey, PROJECTS_DIR, PROJECT_FILE, VAULT_COLLECTIONS } from './paths.js'
import { stableStringify } from './merge.js'

/** Výsledek porovnání databáze se složkou. */
export const SYNC_ACTION = Object.freeze({
  IN_SYNC: 'inSync',
  LEGACY: 'legacy',
  SEED: 'seed',
  REBUILD: 'rebuild',
})

/** Klíč úložiště, kde si databáze pamatuje poslední zapsané značky: { roots: { <klíč složky>: syncId } }. */
export const VAULT_SYNC_KEY = 'uxlog_vault_sync'

/** Pole projektu, která spravuje jen aplikace (soubory v .uxlog/) – chybí-li ve složce, zůstanou z databáze. */
const APP_MANAGED_PROJECT_FIELDS = ['canvas', 'notebookHistory', 'config']

/** Kolekce stavu, které se ze složky sestavují (projekty, entity, souvislosti). */
const STATE_KEYS = ['projects', ...VAULT_COLLECTIONS.map((c) => c.collection), 'connections']

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/**
 * Přečte uložené značky synchronizace (tolerantní k poškozeným datům i ke starší podobě { root, syncId }).
 * @param {unknown} raw - JSON z úložiště
 * @returns {Object.<string, string>} klíč složky (rootKey) → syncId
 */
export function parseVaultSync(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!isObject(data)) return {}
    if (typeof data.root === 'string' && typeof data.syncId === 'string' && data.syncId) {
      return { [rootKey(data.root)]: data.syncId }
    }
    const out = {}
    for (const [key, id] of Object.entries(isObject(data.roots) ? data.roots : {})) {
      if (key && typeof id === 'string' && id) out[key] = id
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Značka uložená v databázi pro složku.
 * @param {Object.<string, string>} marks - z parseVaultSync
 * @param {string} root
 * @returns {string|null}
 */
export function cacheSyncIdFor(marks, root) {
  return marks?.[rootKey(root)] ?? null
}

/**
 * Serializuje značky s novou značkou složky.
 * @param {Object.<string, string>} marks
 * @param {string} root
 * @param {string} syncId
 * @returns {string}
 */
export function serializeVaultSync(marks, root, syncId) {
  return JSON.stringify({ roots: { ...(marks ?? {}), [rootKey(root)]: syncId } })
}

/**
 * Je ve složce aspoň jeden projekt (soubor projects/<složka>/project.md)?
 * @param {Array<{ path: string }>} disk
 * @returns {boolean}
 */
export function vaultHasProjects(disk) {
  return (Array.isArray(disk) ? disk : []).some((f) => {
    const parts = normalizeVaultPath(f?.path).split('/')
    return parts.length === 3 && parts[0] === PROJECTS_DIR && parts[2] === PROJECT_FILE
  })
}

/**
 * Má stav aplikace nějaká data (aspoň jeden projekt)?
 * @param {Object} state
 * @returns {boolean}
 */
export function stateHasData(state) {
  return Array.isArray(state?.projects) && state.projects.some((p) => isObject(p) && p.id)
}

/**
 * Rozhodne, jak databázi srovnat se složkou.
 * @param {{
 *   cacheSyncId: string|null,     značka složky uložená v databázi
 *   manifestSyncId: string|null,  značka v manifestu složky
 *   manifestHasFiles: boolean,    manifest zná nějaké soubory
 *   hasProjects: boolean,         ve složce je aspoň jeden projekt
 *   hasData: boolean,             v databázi je aspoň jeden projekt této složky
 * }} input
 * @returns {string} jedna z hodnot SYNC_ACTION
 */
export function decideVaultSync(input) {
  const { cacheSyncId, manifestSyncId, manifestHasFiles, hasProjects, hasData } = input ?? {}
  if (!hasProjects) return SYNC_ACTION.SEED
  if (cacheSyncId && cacheSyncId === manifestSyncId) return SYNC_ACTION.IN_SYNC
  if (!cacheSyncId && !manifestSyncId && manifestHasFiles && hasData) return SYNC_ACTION.LEGACY
  return SYNC_ACTION.REBUILD
}

/**
 * Vypustí z manifestu soubory dat projektů (první zápis do složky bez projektů: staré záznamy
 * manifestu by jinak vypadaly jako soubory smazané mimo aplikaci).
 * @param {Object.<string, string>} manifest
 * @returns {Object.<string, string>}
 */
export function forgetProjectPaths(manifest) {
  const out = {}
  for (const [path, hash] of Object.entries(manifest ?? {})) {
    if (!normalizeVaultPath(path).startsWith(`${PROJECTS_DIR}/`)) out[path] = hash
  }
  return out
}

/** Seřadí záznamy podle pořadí v databázi; nové (v databázi nejsou) přijdou na konec v pořadí složky. */
function orderLike(list, currentList) {
  const position = new Map((Array.isArray(currentList) ? currentList : []).map((r, i) => [r?.id, i]))
  return list
    .map((record, i) => ({ record, key: position.has(record?.id) ? position.get(record.id) : Infinity, i }))
    .sort((a, b) => (a.key - b.key) || (a.i - b.i))
    .map((x) => x.record)
}

/**
 * Sestaví stav aplikace ze složky (výsledek parseVaultFiles), složka má přednost.
 * - Projekt nebo záznam bez id dostane nové id, záznam bez kódu další volný kód v projektu.
 * - Soubor s chybou nesmaže záznam: zůstane verze z databáze (u projektu celý projekt s jeho záznamy).
 * - Rozvržení plátna a historie chatu, které ve složce chybí, zůstanou z databáze.
 * - Pořadí záznamů zůstane podle databáze, nové se přidají na konec.
 * - Složka obnovuje jen své projekty (scopeProjectIds): projekty databáze mimo ni zůstanou beze změny
 *   a jejich případné kopie ve složce se ignorují.
 * @param {{
 *   current: Object,                                     současný stav databáze
 *   parsed: { data: Object, records: Object, index: Array, errors: Array },  z parseVaultFiles
 *   currentIndex: Object.<string, { collection: string, id: string|null, projectId: string }>,  z buildVaultFiles(projekty složky)
 *   scopeProjectIds?: string[],                          projekty databáze patřící složce (výchozí: všechny)
 *   generateId: () => string,
 *   entityConfig?: Object,
 * }} input
 * @returns {{ data: Object, generatedIds: number, keptPaths: string[] }}
 */
export function buildRebuiltState({ current = {}, parsed, currentIndex = {}, scopeProjectIds, generateId, entityConfig = {} }) {
  // structuredClone zachová sdílené odkazy mezi data a records (stejné objekty záznamů)
  const { data, records } = structuredClone({ data: parsed?.data ?? {}, records: parsed?.records ?? {} })
  for (const key of STATE_KEYS) if (!Array.isArray(data[key])) data[key] = []
  let generatedIds = 0

  // 1. Chybějící id a kódy (ručně založené soubory)
  const projectIdByFolder = new Map()
  for (const entry of parsed?.index ?? []) {
    if (entry.collection !== 'projects') continue
    const project = records[entry.path]
    if (!project) continue
    if (!project.id) {
      project.id = generateId()
      generatedIds++
    }
    projectIdByFolder.set(entry.projectFolder, project.id)
  }
  for (const entry of parsed?.index ?? []) {
    if (entry.collection === 'projects' || entry.collection === 'connections') continue
    const record = records[entry.path]
    if (!record) continue
    if (!record.projectId) record.projectId = projectIdByFolder.get(entry.projectFolder)
    if (!record.id) {
      record.id = generateId()
      generatedIds++
    }
    if (!record.code) {
      const prefix = entityConfig?.[collectionInfo(entry.collection)?.entityType]?.codePrefix
      if (prefix) record.code = generateNextCode(prefix, data[entry.collection].filter((r) => r !== record && r.projectId === record.projectId))
    }
  }
  data.connections = data.connections.filter((c) => isObject(c) && c.projectId)

  // 1b. Projekty, které v databázi patří jinam (jiná složka, vyřazené) – kopie ve složce se ignorují
  const currentProjectIds = (Array.isArray(current?.projects) ? current.projects : []).filter(isObject).map((p) => p.id).filter(Boolean)
  const scope = new Set(Array.isArray(scopeProjectIds) ? scopeProjectIds : currentProjectIds)
  const foreign = new Set(currentProjectIds.filter((id) => !scope.has(id)))
  if (foreign.size) {
    data.projects = data.projects.filter((p) => !foreign.has(p.id))
    for (const key of STATE_KEYS) {
      if (key !== 'projects') data[key] = data[key].filter((r) => !foreign.has(r?.projectId))
    }
  }

  // 2. Soubory s chybou – ponechat verzi z databáze
  const keptPaths = []
  const has = (key, id) => data[key].some((r) => r?.id === id)
  const currentList = (key) => (Array.isArray(current?.[key]) ? current[key] : []).filter(isObject)
  const errorPaths = [...new Set((parsed?.errors ?? []).map((e) => normalizeVaultPath(e?.path)))]
  for (const path of errorPaths) {
    const info = currentIndex[path]
    if (!info) continue
    if (info.collection === 'projects') {
      const project = currentList('projects').find((p) => p.id === info.id)
      if (!project || has('projects', project.id)) continue
      data.projects.push(clone(project))
      for (const key of STATE_KEYS) {
        if (key === 'projects' || key === 'connections') continue
        for (const record of currentList(key)) {
          if (record.projectId === project.id && !has(key, record.id)) data[key].push(clone(record))
        }
      }
      if (!data.connections.some((c) => c.projectId === project.id)) {
        data.connections.push(...clone(currentList('connections').filter((c) => c.projectId === project.id)))
      }
      keptPaths.push(path)
    } else if (info.collection === 'connections') {
      if (!has('projects', info.projectId)) continue
      data.connections = [
        ...data.connections.filter((c) => c.projectId !== info.projectId),
        ...clone(currentList('connections').filter((c) => c.projectId === info.projectId)),
      ]
      keptPaths.push(path)
    } else {
      const record = currentList(info.collection).find((r) => r.id === info.id)
      if (!record || has(info.collection, record.id) || !has('projects', record.projectId)) continue
      data[info.collection].push(clone(record))
      keptPaths.push(path)
    }
  }

  // 3. Pole spravovaná jen aplikací, která ve složce chybí
  const currentProjects = new Map(currentList('projects').map((p) => [p.id, p]))
  for (const project of data.projects) {
    const before = currentProjects.get(project.id)
    if (!before) continue
    for (const field of APP_MANAGED_PROJECT_FIELDS) {
      if (project[field] === undefined && before[field] !== undefined) project[field] = clone(before[field])
    }
  }
  // Prázdná historie chatu se do složky nezapisuje – výchozí hodnota jako v továrně projektu
  for (const project of data.projects) {
    if (!Array.isArray(project.notebookHistory)) project.notebookHistory = []
  }

  // 4. Projekty mimo složku beze změny z databáze, pořadí podle databáze
  if (foreign.size) {
    for (const key of STATE_KEYS) {
      const keep = currentList(key).filter((r) => (key === 'projects' ? foreign.has(r.id) : foreign.has(r.projectId)))
      data[key].push(...clone(keep))
    }
  }
  for (const key of STATE_KEYS) {
    if (key !== 'connections') data[key] = orderLike(data[key], current?.[key])
  }
  return { data, generatedIds, keptPaths }
}

/**
 * Počet záznamů, které se liší mezi dvěma stavy (přidané, smazané, změněné; bez časových razítek).
 * Souvislosti se počítají po projektech.
 * @param {Object} before
 * @param {Object} after
 * @returns {number}
 */
export function countRecordChanges(before, after) {
  const strip = (r) => {
    if (!isObject(r)) return r
    const { updatedAt: _u, lastWorkedAt: _l, ...rest } = r
    return rest
  }
  let count = 0
  for (const key of STATE_KEYS) {
    const group = (state) => {
      const map = new Map()
      for (const r of Array.isArray(state?.[key]) ? state[key] : []) {
        if (!isObject(r)) continue
        if (key === 'connections') {
          const list = map.get(r.projectId) ?? []
          list.push(strip(r))
          map.set(r.projectId, list)
        } else if (r.id) {
          map.set(r.id, strip(r))
        }
      }
      return map
    }
    const a = group(before)
    const b = group(after)
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const left = a.get(id)
      const right = b.get(id)
      const norm = (v) => (key === 'connections' && Array.isArray(v) ? [...v].map(stableStringify).sort().join('|') : stableStringify(v))
      if (left === undefined || right === undefined || norm(left) !== norm(right)) count++
    }
  }
  return count
}
