/**
 * Výpočet dokončenosti (vyplněnosti polí) pro entity.
 * Čisté funkce bez side effects – vhodné pro unit testy.
 * Sledovaná pole jsou v data/entities.yaml (entities.<typ>.completeness).
 */

import { ENTITY_CONFIG } from './dataConfig.js'

/**
 * Vrátí true, pokud je hodnota pole vyplněna.
 * @param {*} val
 * @returns {boolean}
 */
function isFilled(val) {
  if (typeof val === 'string') return val.trim().length > 0
  return Boolean(val)
}

/**
 * Vrátí výsledky kontrol (splněno/nesplněno) podle definice úplnosti.
 * Položka s podmínkou `when` se započítá jen tehdy, když má jiné pole entity danou hodnotu.
 * @param {Object} entity
 * @param {Array<{ field: string, when: { field: string, value: * } | null }>} checks
 * @returns {boolean[]}
 */
export function evaluateCompleteness(entity, checks) {
  const e = entity && typeof entity === 'object' ? entity : {}
  return (Array.isArray(checks) ? checks : [])
    .filter((c) => !c.when || e[c.when.field] === c.when.value)
    .map((c) => isFilled(e[c.field]))
}

/**
 * Vrátí počet vyplněných a celkový počet sledovaných polí entity.
 * @param {Object} entity
 * @param {string} entityType - 'goal' | 'stakeholder' | 'competition' | 'hypothesis' | 'persona' | 'scenario' | 'requirement' | 'teamMember' | 'risk'
 * @returns {{ filled: number, total: number } | null}
 */
export function getEntityCompleteness(entity, entityType) {
  const definition = ENTITY_CONFIG[entityType]?.completeness
  if (!definition) return null
  const checks = evaluateCompleteness(entity, definition)
  return { filled: checks.filter(Boolean).length, total: checks.length }
}
