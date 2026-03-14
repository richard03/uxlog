/**
 * Sdílený reaktivní stav a persistence.
 */

import { reactive, toRaw } from 'vue'
import { loadData, saveData, getEmptyData } from '../storage.js'

export const state = reactive(
  Object.assign(getEmptyData(), loadData())
)

export function initStore() {
  const loaded = loadData()
  Object.assign(state, loaded)
  console.log('[UXLog] initStore, projektů:', state.projects?.length ?? 0)
}

export function getData() {
  return state
}

export function subscribe(_fn) {
  return () => {}
}

export function persist() {
  const raw = toRaw(state)
  saveData(raw)
  console.log('[UXLog] persist, projektů:', state.projects?.length ?? 0)
}
