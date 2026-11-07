/**
 * Sloučení změn záznamů, které přišly mimo aplikaci (lokální HTTP API – Figma plugin).
 * Backend je vydává po revizích (`external_changes_since`); změna nese id záznamu a poslaná pole,
 * která se sloučí do aktuálního záznamu ve stavu (ostatní pole zůstanou). Zbytek stavu se nemění.
 *
 * Čisté funkce bez side effects.
 */

import { LEGACY_SYNC_FIELDS } from './storage.js'
import { stableStringify } from './vault/merge.js'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Upraví záznam ze změny: musí mít id; přežitá pole synchronizace se zahodí.
 * @param {unknown} record
 * @returns {Object|null}
 */
function cleanRecord(record) {
  if (!isObject(record) || typeof record.id !== 'string' || !record.id) return null
  const out = JSON.parse(JSON.stringify(record))
  for (const field of LEGACY_SYNC_FIELDS) delete out[field]
  return out
}

/**
 * Sloučí změny do kolekcí stavu.
 * - Neznámá kolekce, záznam bez id a záznam projektu, který neexistuje, se přeskočí.
 * - Víc změn stejného záznamu se sloučí v pořadí příchodu.
 * - Existující záznam: poslaná pole se do něj doplní (na svém místě). Neexistující záznam se
 *   přidá na konec jen jako celý záznam (s projectId, u projektu stačí id), jinak se přeskočí.
 * - Záznam, který se sloučením nezmění, se nepočítá jako změna.
 * @param {Object} data - stav aplikace (kolekce → pole záznamů); nemění se
 * @param {Array<{ collection: string, record: Object }>} changes
 * @param {string[]} collections - kolekce stavu (getEmptyData)
 * @returns {{ collections: Object.<string, Object[]>, count: number }} jen změněné kolekce (nová pole)
 */
export function mergeExternalChanges(data, changes, collections) {
  const known = new Set(Array.isArray(collections) ? collections : [])
  // Poslední změna každého záznamu, v pořadí příchodu
  const latest = new Map()
  for (const change of Array.isArray(changes) ? changes : []) {
    const collection = change?.collection
    if (!known.has(collection)) continue
    const record = cleanRecord(change?.record)
    if (!record) continue
    const key = `${collection}\u0000${record.id}`
    const earlier = latest.get(key)?.record
    latest.delete(key)
    latest.set(key, { collection, record: earlier ? { ...earlier, ...record } : record })
  }

  const projectIds = new Set((Array.isArray(data?.projects) ? data.projects : []).map((p) => p?.id).filter(Boolean))
  for (const { collection, record } of latest.values()) {
    if (collection === 'projects' && !(Array.isArray(data?.projects) && data.projects.some((p) => p?.id === record.id))) {
      projectIds.add(record.id)
    }
  }

  const out = {}
  let count = 0
  for (const { collection, record } of latest.values()) {
    const list = out[collection] ?? (Array.isArray(data?.[collection]) ? [...data[collection]] : [])
    const index = list.findIndex((r) => r?.id === record.id)
    if (index >= 0) {
      const merged = { ...list[index], ...record }
      // Pořadí klíčů se mezi aplikací a backendem liší – porovnává se obsah
      if (stableStringify(list[index]) === stableStringify(merged)) continue
      list[index] = merged
    } else {
      if (collection !== 'projects' && !projectIds.has(record.projectId)) continue
      list.push(record)
    }
    out[collection] = list
    count++
  }
  return { collections: out, count }
}
