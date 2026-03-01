/**
 * Generování unikátních ID pro entity.
 */

/**
 * Fallback pro starší prohlížeče bez crypto.randomUUID().
 * @returns {string}
 */
function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Vytvoří unikátní ID (UUID v4).
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return fallbackUuid()
}
