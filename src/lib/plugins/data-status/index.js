/**
 * Plugin: Data Status Tracker
 *
 * Sleduje timestampy posledního lokálního uložení a posledního API syncu.
 * Poskytuje reaktivní hodnoty pro StatusBar.
 */

import { ref } from 'vue'

const LS_KEY = 'uxlog_last_save_ts'
const API_KEY = 'uxlog_last_api_ts'

function loadTs(key) {
  const v = localStorage.getItem(key)
  return v ? Number(v) : null
}

/** Timestamp posledního úspěšného uložení do localStorage (ms epoch, nebo null). */
export const lastLocalSave = ref(loadTs(LS_KEY))

/** Timestamp posledního úspěšného zápisu do Flexi API (ms epoch, nebo null). */
export const lastApiSync = ref(loadTs(API_KEY))

/** Zaznamená uložení do localStorage a persistuje timestamp. */
export function recordLocalSave() {
  const now = Date.now()
  lastLocalSave.value = now
  try { localStorage.setItem(LS_KEY, String(now)) } catch {}
}

/** Zaznamená úspěšný zápis do API a persistuje timestamp. */
export function recordApiSync() {
  const now = Date.now()
  lastApiSync.value = now
  try { localStorage.setItem(API_KEY, String(now)) } catch {}
}

/** Plugin definition */
export default {
  id: 'data-status',
  name: 'Data Status Tracker',
  core: true,

  install(ctx) {
    ctx.on('data:persisted', () => {
      recordLocalSave()
    })

    ctx.on('sync:api-write', () => {
      recordApiSync()
    })

    ctx.registerStatusItem({
      id: 'local-save',
      label: 'statusBar.localSave',
      value: lastLocalSave,
      visible: true,
    })

    ctx.registerStatusItem({
      id: 'api-sync',
      label: 'statusBar.apiSync',
      value: lastApiSync,
      visible: false, // Flexi plugin will update this when enabled
    })
  },
}
