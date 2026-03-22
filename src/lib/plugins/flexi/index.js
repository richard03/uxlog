/**
 * Plugin: Flexi API Sync
 *
 * Synchronizuje lokální data s Flexi API.
 * Reaguje na událost data:persisted z jádra – spravuje tombstones a debounced sync.
 * Poskytuje capability sync:run pro periodický sync z App.vue.
 */

import { isFlexiEnabled } from './flexiApi.js'
import { diffAndSync, addTombstones, initFlexiSync, setFlexiSnapshot, setEmitter } from './flexiSync.js'
import { lastApiSync } from '../data-status/index.js'

/** Debounce zápisů do API – čeká na klid 2 s po posledním persist(). */
const DIFF_SYNC_DEBOUNCE_MS = 2000
let _diffSyncTimer = null

export default {
  id: 'flexi-api',
  name: 'Flexi API Sync',

  install(ctx) {
    // Napoj emitter pro flexiSync – volá se po úspěšném zápisu do API
    setEmitter(() => ctx.emit('sync:api-write'))

    // Po každém persist: tombstones + debounced diff sync
    ctx.on('data:persisted', ({ state, deletedEntities }) => {
      // Zaregistruj tombstones pro smazané entity
      if (deletedEntities && Object.keys(deletedEntities).length) {
        addTombstones(deletedEntities)
      }

      // Debounced sync – nespamuj API při rychlé editaci
      clearTimeout(_diffSyncTimer)
      _diffSyncTimer = setTimeout(() => diffAndSync(state), DIFF_SYNC_DEBOUNCE_MS)
    })

    // Capability: periodický sync (voláno z App.vue)
    ctx.registerCapability('sync:run', async (currentState, onMerge) => {
      return initFlexiSync(currentState, onMerge)
    })

    // Capability: dotaz zda je sync povolený
    ctx.registerCapability('sync:enabled', () => isFlexiEnabled())

    // Capability: nastavení snapshotu po merge
    ctx.registerCapability('sync:set-snapshot', (state) => setFlexiSnapshot(state))

    // Status item pro StatusBar – viditelný jen pokud je Flexi povolené
    ctx.registerStatusItem({
      id: 'api-sync',
      label: 'statusBar.apiSync',
      value: lastApiSync,
      visible: () => isFlexiEnabled(),
    })
  },

  uninstall() {
    clearTimeout(_diffSyncTimer)
    _diffSyncTimer = null
  },
}
