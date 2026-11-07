/**
 * Změny dat, které přišly mimo aplikaci (lokální HTTP API – Figma plugin).
 * Sloučení počítá čistá logika lib/externalChanges.js; tady se jen zapíše do stavu a uloží
 * jako změna mimo aplikaci (v historii projektu ji jde vrátit).
 */

import { state, persist } from './state.js'
import { markNextHistoryAsExternal } from './history.js'
import { getEmptyData } from '../storage.js'
import { mergeExternalChanges } from '../externalChanges.js'

/**
 * Sloučí změněné záznamy do stavu a uloží.
 * @param {Array<{ collection: string, record: Object }>} changes
 * @returns {number} počet změněných záznamů
 */
export function applyExternalChanges(changes) {
  const { collections, count } = mergeExternalChanges(state, changes, Object.keys(getEmptyData()))
  if (!count) return 0
  for (const [key, list] of Object.entries(collections)) state[key] = list
  markNextHistoryAsExternal()
  persist()
  return count
}
