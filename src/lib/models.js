/**
 * Definice modelů a továrních funkcí pro entity.
 * Čisté funkce bez side effects - vhodné pro unit testy.
 * Výchozí hodnoty polí jsou v data/entities.yaml (entities.<typ>.defaults).
 */

import { generateId } from './id.js'
import { getEntityDefaults } from './dataConfig.js'

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
  const now = new Date().toISOString()
  return {
    id: generateId(),
    ...getEntityDefaults('project'),
    createdAt: now,
    lastWorkedAt: now,
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
    ...getEntityDefaults('goal'),
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
    ...getEntityDefaults('stakeholder'),
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
    ...getEntityDefaults('competition'),
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
    ...getEntityDefaults('hypothesis'),
    ...overrides,
  }
}

/** @typedef {'open'|'mitigated'|'occurred'|'closed'} RiskStatus */

/**
 * Vytvoří nové riziko projektu (z kick-offu, pre-mortemu nebo rozhovorů).
 * @param {string} projectId
 * @param {Object} overrides
 * @returns {Object}
 */
export function createRisk(projectId, overrides = {}) {
  return {
    id: generateId(),
    projectId,
    ...getEntityDefaults('risk'),
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
    ...getEntityDefaults('persona'),
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
    ...getEntityDefaults('scenario'),
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
    ...getEntityDefaults('activity'),
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
    ...getEntityDefaults('teamMember'),
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
    ...getEntityDefaults('requirement'),
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
    ...getEntityDefaults('task'),
    ...overrides,
  }
}

/** Skóre závažnosti chyby */
const SEVERITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1 }
/** Skóre dopadu chyby */
const IMPACT_SCORE = { high: 3, medium: 2, low: 1 }
/** Pořadí úrovní priority (od nejnižší) */
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical']

/**
 * Vypočítá prioritu chyby na základě závažnosti a dopadu.
 * Priorita nikdy nepřekročí úroveň závažnosti.
 * @param {'critical'|'high'|'medium'|'low'} severity
 * @param {'high'|'medium'|'low'} impact
 * @returns {'critical'|'high'|'medium'|'low'|null}
 */
export function getBugPriority(severity, impact) {
  if (!severity || !impact) return null
  const score = (SEVERITY_SCORE[severity] ?? 0) * (IMPACT_SCORE[impact] ?? 0)
  let priority
  if (score >= 9) priority = 'critical'
  else if (score >= 5) priority = 'high'
  else if (score >= 3) priority = 'medium'
  else priority = 'low'
  const cap = PRIORITY_LEVELS.indexOf(severity)
  const idx = PRIORITY_LEVELS.indexOf(priority)
  return PRIORITY_LEVELS[Math.min(idx, cap)]
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
    ...getEntityDefaults('bug'),
    ...overrides,
  }
}
