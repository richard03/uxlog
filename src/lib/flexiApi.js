/**
 * Re-export shim – skutečná implementace je v plugins/flexi/flexiApi.js.
 * Zachovává zpětnou kompatibilitu importů z tohoto umístění.
 */
export {
  loadFlexiConfig, saveFlexiConfig, isFlexiEnabled,
  flexiRequest, enqueue,
} from './plugins/flexi/flexiApi.js'
