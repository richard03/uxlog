/**
 * Bootstrap: registrace všech built-in pluginů.
 *
 * Voláno z main.js před vytvořením Vue aplikace.
 * Musí proběhnout po inicializaci store (state.js), protože pluginy
 * potřebují přístup k getState() a persist().
 */

import { toRaw } from 'vue'
import { setCoreRefs, registerPlugin } from './registry.js'
import { state, getData, persist } from '../stores/state.js'

import dataStatusPlugin from './data-status/index.js'
import tauriLocalApiPlugin from './tauri-local-api/index.js'
import flexiPlugin from './flexi/index.js'
import geminiPlugin from './gemini/index.js'
import openaiPlugin from './openai/index.js'

/**
 * Inicializuje plugin systém a zaregistruje všechny built-in pluginy.
 */
export function installPlugins() {
  // Injektuj reference na core funkce do registry
  setCoreRefs({
    getState: () => toRaw(getData()),
    getReactiveState: () => state,
    persist,
  })

  // Registrace pluginů v pořadí závislostí:
  // 1. data-status – musí být první, protože flexi emituje sync:api-write
  registerPlugin(dataStatusPlugin)
  // 1b. tauri-local-api – StatusBar URL lokálního HTTP API (jen Tauri)
  registerPlugin(tauriLocalApiPlugin)
  // 2. flexi – závisí na data-status (importuje lastApiSync)
  registerPlugin(flexiPlugin)
  // 3. AI pluginy – nezávisí na ostatních, registrují stejné capabilities
  //    (poslední zapnutý „vyhraje" – pokud jsou oba zapnuté, použije se ten druhý)
  registerPlugin(geminiPlugin)
  registerPlugin(openaiPlugin)

  console.log('[UXLog] Plugins installed')
}
