/**
 * Modul pro práci s uloženými daty (úložiště aplikace – SQLite přes tauriBridge).
 * Centralizuje přístup k datům a zajišťuje konzistentní klíče.
 * V Tauri prostředí zrcadlí zápisy do nativního storage přes tauriBridge.
 */

import { readStoredValue, writeStoredValue } from './tauriBridge.js'

const STORAGE_KEY = 'uxlog_data'

/**
 * Porovná dva záznamy se stejným id a vrátí ten novější.
 * Priorita: updatedAt > lastWorkedAt > createdAt (ISO řetězce). Pokud nelze určit, vrátí a (první).
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
export function pickNewer(a, b) {
  const dateA = a.updatedAt ?? a.lastWorkedAt ?? a.createdAt ?? ''
  const dateB = b.updatedAt ?? b.lastWorkedAt ?? b.createdAt ?? ''
  return dateA >= dateB ? a : b
}

/**
 * Pole, která do záznamů zapisovala starší verze synchronizace s Flexi API (`_ts` čas změny,
 * `_uxlog_id` párovací id). Současná synchronizace je drží mimo záznamy, v datech jsou jen přežitek.
 */
export const LEGACY_SYNC_FIELDS = ['_ts', '_uxlog_id']

/**
 * Odstraní ze záznamů přežitá pole synchronizace (LEGACY_SYNC_FIELDS).
 * @param {Object} data
 * @returns {Object} data (mutováno in-place)
 */
export function stripLegacySyncFields(data) {
  for (const key of Object.keys(getEmptyData())) {
    if (!Array.isArray(data?.[key])) continue
    for (const record of data[key]) {
      if (!record || typeof record !== 'object') continue
      for (const field of LEGACY_SYNC_FIELDS) delete record[field]
    }
  }
  return data
}

/** Pole projektu, která aplikace už nepoužívá (termín projektu – zrušený koncept). */
export const REMOVED_PROJECT_FIELDS = ['deadline']

/**
 * Odstraní z projektů zrušená pole (REMOVED_PROJECT_FIELDS).
 * @param {Object} data
 * @returns {Object} data (mutováno in-place)
 */
export function stripRemovedProjectFields(data) {
  for (const project of Array.isArray(data?.projects) ? data.projects : []) {
    if (!project || typeof project !== 'object') continue
    for (const field of REMOVED_PROJECT_FIELDS) delete project[field]
  }
  return data
}

/** Klíče entit, které patří projektu přes projectId. */
const PROJECT_ENTITY_KEYS = [
  'goals', 'stakeholders', 'competitions', 'hypotheses', 'personas',
  'scenarios', 'requirements', 'activities', 'teamMembers', 'tasks', 'bugs', 'risks', 'sources', 'connections',
]

/**
 * Odstraní entity, jejichž projectId neodpovídá žádnému existujícímu projektu.
 * Chrání před "sirotky" vzniklými starší chybnou implementací mazání projektů.
 * @param {Object} data
 * @returns {Object} data (mutováno in-place)
 */
export function pruneOrphanEntities(data) {
  const projectIds = new Set((data.projects || []).map((p) => p?.id).filter(Boolean))
  for (const key of PROJECT_ENTITY_KEYS) {
    if (!Array.isArray(data[key])) continue
    const before = data[key].length
    data[key] = data[key].filter((e) => !e?.projectId || projectIds.has(e.projectId))
    const removed = before - data[key].length
    if (removed > 0) {
      console.warn(`[UXLog] pruneOrphanEntities: odstraněno ${removed} sirotků v ${key}`)
    }
  }
  return data
}

/**
 * Odstraní záznamy se stejným id – ponechá novější z každé dvojice.
 * Chrání před zdvojením způsobeným souběžnou synchronizací z více prohlížečů.
 * @param {Object} data
 * @returns {Object} data (mutováno in-place)
 */
export function deduplicateData(data) {
  for (const key of Object.keys(getEmptyData())) {
    if (!Array.isArray(data[key])) continue
    const best = new Map()
    for (const item of data[key]) {
      if (!item?.id) continue
      best.set(item.id, best.has(item.id) ? pickNewer(best.get(item.id), item) : item)
    }
    const before = data[key].length
    data[key] = [...best.values()]
    if (data[key].length !== before) {
      console.warn(`[UXLog] deduplicateData: odstraněno ${before - data[key].length} duplicit v ${key}`)
    }
  }
  return data
}

/**
 * Načte všechna data z úložiště aplikace.
 * @returns {Object} Objekt s daty nebo prázdný objekt při chybě
 */
export function loadData() {
  try {
    const raw = readStoredValue(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : getEmptyData()
    const before = raw ?? ''
    pruneOrphanEntities(data)
    deduplicateData(data)
    stripLegacySyncFields(data)
    stripRemovedProjectFields(data)
    const after = JSON.stringify(data)
    if (after !== before) {
      // Úklid (sirotci, duplicity, přežitá a zrušená pole) něco změnil – okamžitě zapíšeme zpět
      writeStoredValue(STORAGE_KEY, after).catch(() => {})
    }
    return data
  } catch (e) {
    console.error('loadData failed:', e)
    return getEmptyData()
  }
}

/**
 * Uloží všechna data do úložiště aplikace (SQLite).
 * @param {Object} data - Data k uložení
 */
export async function saveData(data) {
  try {
    await writeStoredValue(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('saveData failed:', e)
    throw e
  }
}

/**
 * Vrátí prázdnou strukturu dat aplikace.
 * @returns {Object}
 */
export function getEmptyData() {
  return {
    projects: [],
    goals: [],
    stakeholders: [],
    competitions: [],
    hypotheses: [],
    personas: [],
    scenarios: [],
    requirements: [],
    activities: [],
    teamMembers: [],
    tasks: [],
    bugs: [],
    risks: [],
    sources: [],
    connections: [],
  }
}

const HISTORY_STORAGE_KEY = 'uxlog_history'

/**
 * Načte uloženou historii změn projektů (surová data, normalizuje volající).
 * @returns {unknown}
 */
export function loadHistoryData() {
  try {
    const raw = readStoredValue(HISTORY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    console.error('loadHistoryData failed:', e)
    return {}
  }
}

/**
 * Uloží historii změn projektů do úložiště aplikace (SQLite).
 * Chyba (např. plné úložiště) historii jen neuloží – nesmí zablokovat práci s daty.
 * @param {Object} history
 */
export async function saveHistoryData(history) {
  try {
    await writeStoredValue(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.error('saveHistoryData failed:', e)
  }
}
