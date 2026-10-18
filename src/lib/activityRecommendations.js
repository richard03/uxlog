/**
 * Doporučení dalších aktivit podle stavu projektu.
 * Čisté funkce bez side effects – vhodné pro unit testy.
 *
 * Pravidla vycházejí z metodiky technik (viz `guide` v activityTypes.js):
 * chybějící artefakty nebo jejich neúplnost napovídají, která technika by projektu pomohla.
 */

import { APP_CONFIG } from './dataConfig.js'

/** Minimální počet požadavků se stejnou prioritou, od kterého má smysl prioritizační workshop (data/app.yaml). */
const MIN_REQUIREMENTS_FOR_PRIORITIZATION = APP_CONFIG.recommendations.minRequirementsForPrioritization

/**
 * @param {*} v
 * @returns {Array<Object>}
 */
function list(v) {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []
}

/**
 * Množina id scénářů a person, které jsou mezi sebou propojené souvislostí.
 * @param {Array<Object>} connections
 * @returns {Set<string>} id person, které mají aspoň jeden scénář
 */
function personasWithScenario(connections) {
  const out = new Set()
  for (const c of list(connections)) {
    if (c.entityType1 === 'personas' && c.entityType2 === 'scenarios') out.add(c.entityId1)
    if (c.entityType2 === 'personas' && c.entityType1 === 'scenarios') out.add(c.entityId2)
  }
  return out
}

/**
 * Vrátí doporučené typy aktivit pro projekt.
 *
 * @param {Object} projectData
 * @param {Array<Object>} projectData.activities - všechny aktivity projektu (včetně odstraněných – ty se znovu nedoporučují)
 * @param {Array<Object>} [projectData.stakeholders]
 * @param {Array<Object>} [projectData.competitions]
 * @param {Array<Object>} [projectData.personas]
 * @param {Array<Object>} [projectData.scenarios]
 * @param {Array<Object>} [projectData.requirements]
 * @param {Array<Object>} [projectData.hypotheses]
 * @param {Array<Object>} [projectData.risks]
 * @param {Array<Object>} [projectData.connections]
 * @param {Array<string>} [availableTypeKeys] - typy, které lze doporučit (např. bez smazaných šablon); výchozí = všechny
 * @returns {Array<{ typeKey: string, reasonKey: string, count: number }>}
 */
export function getActivityRecommendations(projectData, availableTypeKeys) {
  const d = projectData && typeof projectData === 'object' ? projectData : {}
  const stakeholders = list(d.stakeholders)
  const competitions = list(d.competitions)
  const personas = list(d.personas)
  const scenarios = list(d.scenarios)
  const requirements = list(d.requirements)
  const hypotheses = list(d.hypotheses)

  const out = []
  const add = (typeKey, reasonKey, count = 0) => out.push({ typeKey, reasonKey, count })

  if (!list(d.risks).length) add('pre_mortem', 'noRisks')

  if (!stakeholders.length) add('stakeholder_analysis', 'noStakeholders')
  else {
    const incomplete = stakeholders.filter((s) => !s.influenceLevel || !s.interestLevel).length
    if (incomplete) add('stakeholder_analysis', 'stakeholderMatrixIncomplete', incomplete)
  }

  if (!competitions.length) add('competitive_analysis', 'noCompetitors')

  if (!personas.length) add('personas', 'noPersonas')
  else {
    const covered = personasWithScenario(d.connections)
    const without = personas.filter((p) => !covered.has(p.id)).length
    if (without) add('scenarios', scenarios.length ? 'personasWithoutScenarios' : 'noScenarios', without)
  }

  const uncategorized = requirements.filter((r) => !r.category).length
  if (uncategorized) add('requirements', 'requirementsUncategorized', uncategorized)
  if (requirements.length >= MIN_REQUIREMENTS_FOR_PRIORITIZATION) {
    const priorities = new Set(requirements.map((r) => r.priority || ''))
    if (priorities.size === 1) add('prioritization_workshop', 'requirementsNotPrioritized', requirements.length)
  }

  const untested = hypotheses.filter((h) => (h.status || 'untested') === 'untested').length
  if (untested) add('usability_testing', 'untestedHypotheses', untested)

  // Typ, který už projekt má (i odstraněný), znovu nedoporučujeme; každý typ nejvýš jednou
  const present = new Set(list(d.activities).map((a) => a.typeKey).filter(Boolean))
  const allowed = Array.isArray(availableTypeKeys) ? new Set(availableTypeKeys) : null
  const seen = new Set()
  return out.filter((r) => {
    if (present.has(r.typeKey) || seen.has(r.typeKey)) return false
    if (allowed && !allowed.has(r.typeKey)) return false
    seen.add(r.typeKey)
    return true
  })
}
