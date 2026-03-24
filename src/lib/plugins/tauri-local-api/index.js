/**
 * Plugin: Stav lokálního HTTP API v desktopové aplikaci (Tauri).
 *
 * V StatusBar zobrazí adresu 127.0.0.1:port, na které naslouchá Rust server
 * pro Figma plugin. Ve webovém buildu se neinstaluje.
 */

import { ref } from 'vue'
import { isTauri } from '../../tauriBridge.js'

/**
 * Načte port z Tauri backendu a vrátí řetězec ve tvaru 127.0.0.1:port.
 * @returns {Promise<string>}
 */
async function fetchApiEndpointLabel() {
  const { invoke } = await import('@tauri-apps/api/core')
  const port = await invoke('get_api_port')
  return `127.0.0.1:${port}`
}

export default {
  id: 'tauri-local-api',
  name: 'Tauri Local API Status',
  core: true,

  /**
   * Zaregistruje status položku s URL lokálního API (pouze v Tauri).
   * @param {{ registerStatusItem: Function }} ctx  Kontext z plugin registry
   */
  install(ctx) {
    if (!isTauri) return

    const apiEndpoint = ref('')

    fetchApiEndpointLabel()
      .then((label) => {
        apiEndpoint.value = label
      })
      .catch((err) => {
        console.error('[TauriLocalApi] Nelze načíst port API:', err)
        apiEndpoint.value = '127.0.0.1:?'
      })

    ctx.registerStatusItem({
      id: 'tauri-local-http-api',
      label: 'statusBar.localApi',
      value: apiEndpoint,
      kind: 'text',
      visible: true,
    })
  },
}
