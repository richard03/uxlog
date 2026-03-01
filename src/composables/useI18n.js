/**
 * Jednoduchý composable pro překlady.
 * Vrací objekt t s vnořenou strukturou (t.common.save, t.project.name, …)
 * a funkci tPath pro dynamické cesty (tPath('scope.small')).
 */

import cs from '../i18n/cs.js'

const messages = { cs }

/**
 * Vrátí hodnotu podle tečkované cesty v objektu.
 * @param {Object} obj
 * @param {string} path
 * @returns {string}
 */
function getByPath(obj, path) {
  const parts = path.split('.')
  let val = obj
  for (const p of parts) val = val?.[p]
  return typeof val === 'string' ? val : path
}

/**
 * Vrací objekt překladů a helper pro dynamické cesty.
 * @param {string} [locale='cs']
 * @returns {{ t: Object, tPath: (path: string) => string }}
 */
export function useI18n(locale = 'cs') {
  const t = messages[locale] || messages.cs
  const tPath = (path) => getByPath(t, path)
  return { t, tPath }
}
