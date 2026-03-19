/**
 * Sdílený reaktivní stav a persistence.
 *
 * persist() automaticky orazítkuje updatedAt na každém záznamu, který se
 * od posledního persist() lišil – bez nutnosti cokoliv měnit v store modulech.
 * Porovnání probíhá vůči persistedSnapshot (deep-clone stavu po posledním uložení).
 */

import { reactive, toRaw } from 'vue'
import { loadData, saveData, getEmptyData, pickNewer } from '../storage.js'
import { diffAndSync } from '../flexiSync.js'
import { recordLocalSave } from '../dataStatus.js'

const _initialData = Object.assign(getEmptyData(), loadData())
export const state = reactive(_initialData)

/** Deep-clone stavu po posledním persist() – základ pro detekci změn. */
let persistedSnapshot = JSON.parse(JSON.stringify(_initialData))

export function initStore() {
  const loaded = loadData()
  Object.assign(state, loaded)
  persistedSnapshot = JSON.parse(JSON.stringify(loaded))
  console.log('[UXLog] initStore, projektů:', state.projects?.length ?? 0)
}

export function getData() {
  return state
}

export function subscribe(_fn) {
  return () => {}
}

/**
 * Odstraní záznamy se stejným id přímo z reaktivního state.
 * Volá se z persist() po každém syncu i uživatelské akci.
 * Vrací true pokud bylo cokoli odstraněno.
 */
function deduplicateState() {
  let changed = false
  for (const key of Object.keys(getEmptyData())) {
    if (!Array.isArray(state[key])) continue
    const bestMap = new Map()
    for (const item of state[key]) {
      if (!item?.id) continue
      bestMap.set(item.id, bestMap.has(item.id) ? pickNewer(bestMap.get(item.id), item) : item)
    }
    if (bestMap.size < state[key].length) {
      console.warn(`[UXLog] deduplicateState: odstraněno ${state[key].length - bestMap.size} duplikátů v ${key}`)
      state[key] = [...bestMap.values()]
      changed = true
    }
  }
  return changed
}

export function persist() {
  // Odstraň duplikáty vzniklé synchem z API (před snapshotem i uložením)
  deduplicateState()

  // Orazítkuj updatedAt na každém záznamu, který se změnil od posledního persist()
  const now = new Date().toISOString()
  for (const key of Object.keys(getEmptyData())) {
    if (!Array.isArray(state[key])) continue
    const prevMap = new Map((persistedSnapshot[key] || []).map((r) => [r.id, r]))
    for (const record of state[key]) {
      if (!record?.id) continue
      const prev = prevMap.get(record.id)
      if (!prev || JSON.stringify(toRaw(record)) !== JSON.stringify(prev)) {
        record.updatedAt = now
      }
    }
  }

  const raw = toRaw(state)
  persistedSnapshot = JSON.parse(JSON.stringify(raw))
  saveData(raw)
  recordLocalSave()
  diffAndSync(raw)
  console.log('[UXLog] persist, projektů:', state.projects?.length ?? 0)
}
