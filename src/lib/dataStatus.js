/**
 * Re-export shim – skutečná implementace je v plugins/data-status/index.js.
 * Zachovává zpětnou kompatibilitu importů z tohoto umístění.
 */
export { lastLocalSave, lastApiSync, recordLocalSave, recordApiSync } from './plugins/data-status/index.js'
