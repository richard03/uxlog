/**
 * Vue composable pro práci s plugin systémem.
 * Poskytuje reaktivní přístup ke capabilities, status items a správě pluginů.
 */

import { computed } from 'vue'
import {
  hasCapability, callCapability, getStatusItems, getPlugins,
  getAllPluginDefs, isPluginActive, enablePlugin, disablePlugin,
} from '../lib/plugins/registry.js'

/**
 * Vrací metody a reaktivní stav pro práci s pluginy.
 * @returns {Object}
 */
export function usePlugin() {
  return {
    /** Reaktivní kontrola dostupnosti capability */
    hasCapability: (id) => computed(() => hasCapability(id)),
    /** Volání capability (synchronní nebo async) */
    callCapability,
    /** Reaktivní pole status items pro StatusBar */
    statusItems: computed(() => getStatusItems()),
    /** Reaktivní seznam aktivních pluginů */
    plugins: computed(() => getPlugins()),
    /** Všechny definice pluginů (i vypnuté) */
    allPluginDefs: computed(() => getAllPluginDefs()),
    /** Kontrola zda je plugin aktivní */
    isPluginActive,
    /** Zapnout plugin za běhu */
    enablePlugin,
    /** Vypnout plugin za běhu */
    disablePlugin,
  }
}
