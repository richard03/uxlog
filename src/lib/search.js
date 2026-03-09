/**
 * Fulltextové vyhledávání přes kódy, názvy, popisy a další textové atributy.
 * Čisté funkce - vhodné pro unit testy.
 */

/**
 * Normalizuje text pro vyhledávání (lowercase, trim).
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text ?? '').toLowerCase().trim()
}

/**
 * Extrahuje textové pole z entity pro indexaci.
 * @param {Object} entity
 * @param {string[]} fields - Názvy polí
 * @returns {string}
 */
function extractText(entity, fields) {
  return fields
    .map((f) => entity[f])
    .filter(Boolean)
    .map(String)
    .join(' ')
}

/**
 * Kontroluje, zda entity odpovídá dotazu.
 * @param {Object} entity
 * @param {string[]} searchFields
 * @param {string} query - Normalizovaný dotaz
 * @returns {boolean}
 */
function entityMatches(entity, searchFields, query) {
  if (!query) return true
  const text = normalizeText(extractText(entity, searchFields))
  const terms = query.split(/\s+/).filter(Boolean)
  return terms.every((term) => text.includes(term))
}

/** Mapování entit na pole pro vyhledávání */
const SEARCH_FIELDS = {
  project: ['name'],
  goal: ['code', 'name', 'description', 'metrics'],
  stakeholder: ['name', 'description', 'influenceLevel', 'interestLevel'],
  competition: ['name', 'description', 'strengths', 'weaknesses', 'inspiration'],
  hypothesis: ['code', 'name', 'description', 'explanation'],
  persona: ['code', 'name', 'description', 'motivation', 'needs', 'problems', 'context', 'recruitmentCriteria', 'targetGroupSize', 'targetGroupValue'],
  scenario: ['code', 'name', 'type', 'description', 'frequency', 'value'],
  requirement: ['code', 'name', 'description', 'motivation', 'wontHaveExplanation'],
  activity: ['name', 'description'],
  teamMember: ['name', 'role', 'email', 'phone', 'note'],
  task: ['code', 'name', 'description', 'metrics', 'achievability', 'relevance', 'assignee'],
  bug: ['code', 'name', 'expectedBehavior', 'actualBehavior', 'stepsToReproduce'],
}

/**
 * Vyhledá ve všech entitách podle dotazu.
 * @param {Object} data - Kompletní data aplikace
 * @param {string} query - Vyhledávací dotaz
 * @param {string} [projectId] - Volitelné omezení na projekt
 * @returns {Object} Objekt s poli matchingIds pro každý typ entity
 */
export function searchAll(data, query, projectId) {
  const q = normalizeText(query)
  const result = {
    projectIds: [],
    goalIds: [],
    stakeholderIds: [],
    competitionIds: [],
    hypothesisIds: [],
    personaIds: [],
    scenarioIds: [],
    requirementIds: [],
    activityIds: [],
    teamMemberIds: [],
    taskIds: [],
    bugIds: [],
  }

  const filterByProject = (entity) => !projectId || entity.projectId === projectId

  if (data.projects) {
    result.projectIds = data.projects
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.project, q))
      .map((e) => e.id)
  }
  if (data.goals) {
    result.goalIds = data.goals
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.goal, q))
      .map((e) => e.id)
  }
  if (data.stakeholders) {
    result.stakeholderIds = data.stakeholders
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.stakeholder, q))
      .map((e) => e.id)
  }
  if (data.competitions) {
    result.competitionIds = data.competitions
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.competition, q))
      .map((e) => e.id)
  }
  if (data.hypotheses) {
    result.hypothesisIds = data.hypotheses
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.hypothesis, q))
      .map((e) => e.id)
  }
  if (data.personas) {
    result.personaIds = data.personas
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.persona, q))
      .map((e) => e.id)
  }
  if (data.scenarios) {
    result.scenarioIds = data.scenarios
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.scenario, q))
      .map((e) => e.id)
  }
  if (data.requirements) {
    result.requirementIds = data.requirements
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.requirement, q))
      .map((e) => e.id)
  }
  if (data.activities) {
    result.activityIds = data.activities
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.activity, q))
      .map((e) => e.id)
  }
  if (data.teamMembers) {
    result.teamMemberIds = data.teamMembers
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.teamMember, q))
      .map((e) => e.id)
  }
  if (data.tasks) {
    result.taskIds = data.tasks
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.task, q))
      .map((e) => e.id)
  }
  if (data.bugs) {
    result.bugIds = data.bugs
      .filter((e) => filterByProject(e) && entityMatches(e, SEARCH_FIELDS.bug, q))
      .map((e) => e.id)
  }

  return result
}
