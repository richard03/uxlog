/**
 * Re-export shim – skutečná implementace je v plugins/ai-shared/keys.js.
 * Zachovává zpětnou kompatibilitu importů z tohoto umístění.
 */
export {
  loadAiKeys, saveAiKeys, getAiKey, setAiKey,
  isAiServiceEnabled, setAiServiceEnabled,
} from './plugins/ai-shared/keys.js'
