/**
 * Definice modelů a továrních funkcí pro entity.
 * Čisté funkce bez side effects - vhodné pro unit testy.
 */

import { generateId } from './id.js'

/**
 * Vytvoří novou souvislost mezi dvěma entitami.
 * @param {string} projectId
 * @param {string} entityType1 - klíč store (např. 'goals', 'personas')
 * @param {string} entityId1
 * @param {string} entityType2
 * @param {string} entityId2
 * @param {string} [note]
 * @returns {Object}
 */
export function createConnection(projectId, entityType1, entityId1, entityType2, entityId2, note = '') {
  return {
    id: generateId(),
    projectId,
    entityType1,
    entityId1,
    entityType2,
    entityId2,
    note,
    createdAt: new Date().toISOString(),
  }
}

/** @typedef {'small'|'medium'|'large'} Scope */
/** @typedef {'high'|'medium'|'low'} Priority */
/** @typedef {'research'|'design'|'development'} Phase */
/** @typedef {'protopersona'|'persona'} PersonaStatus */
/** @typedef {'untested'|'tested'|'refuted'} HypothesisStatus */
/** @typedef {'must'|'should'|'could'|'wont'} Priority */
/** @typedef {'high'|'medium'|'low'} StakeholderLevel */
/** @typedef {'key_player'|'keep_satisfied'|'keep_informed'|'monitor'} StakeholderStrategy */

/**
 * Vrátí strategii stakeholdera podle matice moci/zájmu (Mendelowova matice).
 * @param {StakeholderLevel} influenceLevel
 * @param {StakeholderLevel} interestLevel
 * @returns {StakeholderStrategy|null}
 */
export function getStakeholderStrategy(influenceLevel, interestLevel) {
  if (!influenceLevel || !interestLevel) return null
  if (influenceLevel === 'high' && interestLevel === 'high') return 'key_player'
  if (influenceLevel === 'high') return 'keep_satisfied'
  if (interestLevel === 'high') return 'keep_informed'
  return 'monitor'
}

/**
 * Vytvoří nový projekt.
 * @param {Object} overrides - Přepsání výchozích hodnot
 * @returns {Object}
 */
export function createProject(overrides = {}) {
  return {
    id: generateId(),
    name: '',
    scope: 'medium',
    priority: 'medium',
    phase: 'research',
    createdAt: new Date().toISOString(),
    lastWorkedAt: new Date().toISOString(),
    deadline: '',
    notebook: '',
    sortOrder: 9999,
    color: '',
    ...overrides,
  }
}

/**
 * Vytvoří nový cíl.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createGoal(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    description: '',
    metrics: '',
    url: '',
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří nového stakeholdera.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createStakeholder(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    name: '',
    description: '',
    influenceLevel: '',
    interestLevel: '',
    requirementIds: [],
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří novou konkurenci.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createCompetition(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    name: '',
    description: '',
    strengths: '',
    weaknesses: '',
    inspiration: '',
    url: '',
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří novou hypotézu.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createHypothesis(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    description: '',
    status: 'untested',
    explanation: '',
    url: '',
    requirementIds: [],
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří novou personu.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createPersona(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    status: 'protopersona',
    description: '',
    motivation: '',
    needs: '',
    problems: '',
    context: '',
    recruitmentCriteria: '',
    targetGroupSize: '',
    targetGroupValue: '',
    url: '',
    scenarioIds: [],
    requirementIds: [],
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří nový scénář.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createScenario(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    type: 'main',
    description: '',
    frequencyValue: '',
    frequencyUnit: 'daily',
    valueAmount: '',
    valueUnit: 'daily',
    userCount: '',
    userCountUnit: 'daily',
    priority: 'could',
    url: '',
    personaIds: [],
    hypothesisIds: [],
    requirementIds: [],
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří novou aktivitu.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createActivity(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    typeKey: null,
    name: '',
    description: '',
    status: 'pending',
    dismissed: false,
    deadline: '',
    sortOrder: 9999,
    checkedItems: [],
    checklistLabels: {},
    customChecklistItems: [],
    removedChecklistItems: [],
    baseChecklist: null,
    ...overrides,
  }
}

/**
 * Vytvoří nového člena týmu.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTeamMember(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    name: '',
    role: '',
    email: '',
    phone: '',
    note: '',
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří nový požadavek.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createRequirement(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    description: '',
    motivation: '',
    priority: 'could',
    url: '',
    wontHaveExplanation: '',
    conflictingRequirementIds: [],
    scenarioIds: [],
    stakeholderIds: [],
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/**
 * Vytvoří nový úkol (SMART).
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTask(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    description: '',
    metrics: '',
    achievability: '',
    relevance: '',
    dueDate: '',
    assignee: '',
    url: '',
    status: 'open',
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}

/** Skóre závažnosti chyby */
const SEVERITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1 }
/** Skóre dopadu chyby */
const IMPACT_SCORE = { high: 3, medium: 2, low: 1 }

/**
 * Vypočítá prioritu chyby na základě závažnosti a dopadu.
 * @param {'critical'|'high'|'medium'|'low'} severity
 * @param {'high'|'medium'|'low'} impact
 * @returns {'critical'|'high'|'medium'|'low'|null}
 */
export function getBugPriority(severity, impact) {
  if (!severity || !impact) return null
  const score = (SEVERITY_SCORE[severity] ?? 0) * (IMPACT_SCORE[impact] ?? 0)
  if (score >= 9) return 'critical'
  if (score >= 5) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

/**
 * Vytvoří novou chybu.
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createBug(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    code: '',
    name: '',
    expectedBehavior: '',
    actualBehavior: '',
    stepsToReproduce: '',
    severity: '',
    impact: '',
    url: '',
    status: 'zadano',
    sortOrder: 9999,
    customFields: {},
    ...overrides,
  }
}
