/**
 * Výpočet dokončenosti (vyplněnosti polí) pro entity.
 * Čisté funkce bez side effects – vhodné pro unit testy.
 */

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
 * Definice sledovaných polí pro každý typ entity.
 * Vrátí pole boolean hodnot (splněno/nesplněno) pro každé pole.
 * @type {Object.<string, (entity: Object) => boolean[]>}
 */
const ENTITY_FIELD_CHECKS = {
  goal: (e) => ['name', 'description', 'metrics'].map(f => isFilled(e[f])),

  stakeholder: (e) => ['name', 'description', 'influenceLevel', 'interestLevel'].map(f => isFilled(e[f])),

  competition: (e) => ['name', 'description', 'strengths', 'weaknesses', 'inspiration'].map(f => isFilled(e[f])),

  hypothesis: (e) => {
    const checks = ['name', 'description'].map(f => isFilled(e[f]))
    if (e.status === 'refuted') checks.push(isFilled(e.explanation))
    return checks
  },

  persona: (e) => [
    'name', 'description', 'motivation', 'needs', 'problems',
    'context', 'recruitmentCriteria', 'targetGroupSize', 'targetGroupValue',
  ].map(f => isFilled(e[f])),

  scenario: (e) => ['name', 'description', 'frequencyValue', 'valueAmount', 'userCount'].map(f => isFilled(e[f])),

  requirement: (e) => {
    const checks = ['name', 'description', 'motivation'].map(f => isFilled(e[f]))
    if (e.priority === 'wont') checks.push(isFilled(e.wontHaveExplanation))
    return checks
  },

  teamMember: (e) => ['name', 'role', 'email'].map(f => isFilled(e[f])),
}

/**
 * Vrátí počet vyplněných a celkový počet sledovaných polí entity.
 * @param {Object} entity
 * @param {string} entityType - 'goal' | 'stakeholder' | 'competition' | 'hypothesis' | 'persona' | 'scenario' | 'requirement' | 'teamMember'
 * @returns {{ filled: number, total: number } | null}
 */
export function getEntityCompleteness(entity, entityType) {
  const getChecks = ENTITY_FIELD_CHECKS[entityType]
  if (!getChecks) return null
  const checks = getChecks(entity)
  return { filled: checks.filter(Boolean).length, total: checks.length }
}
