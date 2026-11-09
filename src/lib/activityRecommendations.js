/**
 * Doporučení dalších aktivit podle stavu projektu.
 * Čisté funkce bez side effects – vhodné pro unit testy.
 *
 * Nový projekt začíná jen úvodními aktivitami (kick-off, cíle, stakeholdeři, konkurence);
 * další techniky přidává uživatel podle doporučení. Pravidla vycházejí z metodiky technik
 * (viz `guide` v activityTypes.js) a jdou v pořadí UX procesu: chybějící artefakty nebo jejich
 * neúplnost napovídají, která technika by projektu pomohla teď.
 *
 * Předání výstupů a Retrospektivu doporučujeme vždy (projekt je má mít), dokud nejsou v seznamu aktivit.
 */

import { APP_CONFIG } from './dataConfig.js'

/** Minimální počet požadavků se stejnou prioritou, od kterého má smysl prioritizační workshop (data/app.yaml). */
const MIN_REQUIREMENTS_FOR_PRIORITIZATION = APP_CONFIG.recommendations.minRequirementsForPrioritization
/** Kolik doporučení podle stavu projektu ukázat (data/app.yaml). */
const MAX_CONTEXTUAL = APP_CONFIG.recommendations.maxContextual

/** Aktivity, které doporučujeme vždy, dokud nejsou v seznamu (typ → důvod). */
export const ALWAYS_RECOMMENDED = [
  { typeKey: 'design_handoff', reasonKey: 'handoffAlways' },
  { typeKey: 'retrospective', reasonKey: 'retrospectiveAlways' },
]

/**
 * @param {*} v
 * @returns {Array<Object>}
 */
function list(v) {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []
}

/**
 * Množina id person, které mají propojený aspoň jeden scénář.
 * @param {Array<Object>} connections
 * @returns {Set<string>}
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
 * Doporučení podle stavu artefaktů projektu, v pořadí UX procesu (může obsahovat duplicitní typy).
 * @param {Object} d - data projektu
 * @param {Set<string>} activeTypes - typy aktivit, které jsou v seznamu (neodstraněné)
 * @returns {Array<{ typeKey: string, reasonKey: string, count: number }>}
 */
function contextualRules(d, activeTypes) {
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
    const influential = stakeholders.filter((s) => s.influenceLevel === 'high').length
    if (influential) add('stakeholder_interviews', 'influentialStakeholders', influential)
  }

  if (!competitions.length) add('competitive_analysis', 'noCompetitors')

  if (!personas.length) add('personas', 'noPersonas')
  else {
    add('user_interviews', 'personasNeedValidation', personas.length)
    const covered = personasWithScenario(d.connections)
    const without = personas.filter((p) => !covered.has(p.id)).length
    if (without) add('scenarios', scenarios.length ? 'personasWithoutScenarios' : 'noScenarios', without)
  }

  if (!requirements.length) {
    if (scenarios.length) add('requirements', 'noRequirements', scenarios.length)
  } else {
    const uncategorized = requirements.filter((r) => !r.category).length
    if (uncategorized) add('requirements', 'requirementsUncategorized', uncategorized)
    if (requirements.length >= MIN_REQUIREMENTS_FOR_PRIORITIZATION) {
      const priorities = new Set(requirements.map((r) => r.priority || ''))
      if (priorities.size === 1) add('prioritization_workshop', 'requirementsNotPrioritized', requirements.length)
    }
    if (scenarios.length) add('wireframing', 'readyForDesign', requirements.length)
  }

  const untested = hypotheses.filter((h) => (h.status || 'untested') === 'untested').length
  if (untested) add('usability_testing', 'untestedHypotheses', untested)
  if (activeTypes.has('wireframing')) add('usability_testing', 'wireframesUntested')

  return out
}

/**
 * Vrátí doporučené typy aktivit pro projekt: nejvýš `maxContextual` doporučení podle stavu projektu
 * (typ, který projekt má – i odstraněný –, se znovu nedoporučuje) a za nimi vždy Předání výstupů
 * a Retrospektivu, pokud nejsou v seznamu aktivit (odstraněné se doporučí znovu).
 *
 * @param {Object} projectData
 * @param {Array<Object>} projectData.activities - všechny aktivity projektu (odstraněné mají `dismissed: true`)
 * @param {Array<Object>} [projectData.stakeholders]
 * @param {Array<Object>} [projectData.competitions]
 * @param {Array<Object>} [projectData.personas]
 * @param {Array<Object>} [projectData.scenarios]
 * @param {Array<Object>} [projectData.requirements]
 * @param {Array<Object>} [projectData.hypotheses]
 * @param {Array<Object>} [projectData.risks]
 * @param {Array<Object>} [projectData.connections]
 * @param {Array<string>} [availableTypeKeys] - typy, které lze doporučit (např. bez smazaných šablon); výchozí = všechny
 * @param {number} [maxContextual] - limit doporučení podle stavu projektu; výchozí z data/app.yaml
 * @returns {Array<{ typeKey: string, reasonKey: string, count: number, always: boolean }>}
 */
export function getActivityRecommendations(projectData, availableTypeKeys, maxContextual = MAX_CONTEXTUAL) {
  const d = projectData && typeof projectData === 'object' ? projectData : {}
  const activities = list(d.activities).filter((a) => a.typeKey)
  const present = new Set(activities.map((a) => a.typeKey))
  const active = new Set(activities.filter((a) => !a.dismissed).map((a) => a.typeKey))
  const allowed = Array.isArray(availableTypeKeys) ? new Set(availableTypeKeys) : null
  const isAllowed = (key) => !allowed || allowed.has(key)
  const alwaysKeys = new Set(ALWAYS_RECOMMENDED.map((r) => r.typeKey))
  const limit = typeof maxContextual === 'number' && !Number.isNaN(maxContextual) ? Math.max(0, maxContextual) : MAX_CONTEXTUAL

  const seen = new Set()
  const contextual = contextualRules(d, active).filter((r) => {
    if (present.has(r.typeKey) || seen.has(r.typeKey) || alwaysKeys.has(r.typeKey) || !isAllowed(r.typeKey)) return false
    seen.add(r.typeKey)
    return true
  }).slice(0, limit).map((r) => ({ ...r, always: false }))

  const always = ALWAYS_RECOMMENDED
    .filter((r) => !active.has(r.typeKey) && isAllowed(r.typeKey))
    .map((r) => ({ ...r, count: 0, always: true }))

  return [...contextual, ...always]
}
