/**
 * Definice modelů a továrních funkcí pro entity.
 * Čisté funkce bez side effects - vhodné pro unit testy.
 */

import { generateId } from './id.js'

/** @typedef {'small'|'medium'|'large'} Scope */
/** @typedef {'high'|'medium'|'low'} Priority */
/** @typedef {'research'|'design'|'development'} Phase */
/** @typedef {'protopersona'|'persona'} PersonaStatus */
/** @typedef {'untested'|'tested'|'refuted'} HypothesisStatus */
/** @typedef {'must'|'should'|'could'|'wont'} MoscowRating */

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
    lastWorkedAt: new Date().toISOString(),
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
    requirementIds: [],
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
    targetGroupSize: '',
    targetGroupValue: '',
    scenarioIds: [],
    requirementIds: [],
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
    frequency: '',
    value: '',
    moscowRating: 'could',
    personaIds: [],
    hypothesisIds: [],
    requirementIds: [],
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
    moscowRating: 'could',
    wontHaveExplanation: '',
    conflictingRequirementIds: [],
    scenarioIds: [],
    stakeholderIds: [],
    ...overrides,
  }
}
