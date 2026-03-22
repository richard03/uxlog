/**
 * Re-export shim – skutečná implementace je v plugins/flexi/flexiSync.js.
 * Zachovává zpětnou kompatibilitu importů z tohoto umístění.
 */
export {
  addTombstones, SYNCABLE_ENTITIES, setFlexiSnapshot,
  diffAndSync, initFlexiSync, setEmitter,
} from './plugins/flexi/flexiSync.js'
