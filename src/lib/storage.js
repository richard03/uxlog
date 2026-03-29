/**
 * Modul pro práci s localStorage.
 * Centralizuje přístup k datům a zajišťuje konzistentní klíče.
 * V Tauri prostředí zrcadlí zápisy do souborů přes tauriBridge.
 */

import { mirrorToTauri } from './tauriBridge.js'

const STORAGE_KEY = 'uxlog_data'

/**
 * Porovná dva záznamy se stejným id a vrátí ten novější.
 * Priorita: _ts (číslo z API syncu) > lastWorkedAt (ISO) > createdAt (ISO).
 * Pokud nelze určit, vrátí a (první).
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
export function pickNewer(a, b) {
  const tsA = a._ts ?? 0
  const tsB = b._ts ?? 0
  if (tsA !== tsB) return tsA > tsB ? a : b
  const dateA = a.updatedAt ?? a.lastWorkedAt ?? a.createdAt ?? ''
  const dateB = b.updatedAt ?? b.lastWorkedAt ?? b.createdAt ?? ''
  return dateA >= dateB ? a : b
}

/** Klíče entit, které patří projektu přes projectId. */
const PROJECT_ENTITY_KEYS = [
  'goals', 'stakeholders', 'competitions', 'hypotheses', 'personas',
  'scenarios', 'requirements', 'activities', 'teamMembers', 'tasks', 'bugs', 'connections',
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
 * Načte všechna data z localStorage.
 * @returns {Object} Objekt s daty nebo prázdný objekt při chybě
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : getEmptyData()
    const before = raw ?? ''
    pruneOrphanEntities(data)
    deduplicateData(data)
    const after = JSON.stringify(data)
    if (after !== before) {
      // Deduplikace něco odstranila – okamžitě zapíšeme zpět do localStorage
      localStorage.setItem(STORAGE_KEY, after)
    }
    return data
  } catch (e) {
    console.error('loadData failed:', e)
    return getEmptyData()
  }
}

/**
 * Uloží všechna data do localStorage a zrcadlí do Tauri souboru.
 * @param {Object} data - Data k uložení
 */
export async function saveData(data) {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, json)
    await mirrorToTauri(STORAGE_KEY, json)
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
    connections: [],
  }
}
