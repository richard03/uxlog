/**
 * Store modul pro režim Dokument – dokument projektu se odvozuje z dat (neukládá se),
 * úpravy textu v dokumentu jdou přes běžné update* funkce entit, takže se zapíší do historie
 * a aktualizují lastWorkedAt jako úprava v detailu.
 */

import { state } from './state.js'
import { buildProjectDocument, entityFieldUpdate } from '../projectDocument.js'
import { updateGoal } from './goals.js'
import { updateStakeholder } from './stakeholders.js'
import { updateTeamMember } from './teamMembers.js'
import { updateCompetition } from './competitions.js'
import { updateHypothesis } from './hypotheses.js'
import { updatePersona } from './personas.js'
import { updateScenario } from './scenarios.js'
import { updateRequirement } from './requirements.js'
import { updateRisk } from './risks.js'
import { updateActivity } from './activities.js'
import { updateTask } from './tasks.js'
import { updateBug } from './bugs.js'

/** Úprava entity podle kolekce – stejné funkce jako v detailu. */
const UPDATE_BY_TYPE = {
  goals: updateGoal,
  stakeholders: updateStakeholder,
  teamMembers: updateTeamMember,
  competitions: updateCompetition,
  hypotheses: updateHypothesis,
  personas: updatePersona,
  scenarios: updateScenario,
  requirements: updateRequirement,
  risks: updateRisk,
  activities: updateActivity,
  tasks: updateTask,
  bugs: updateBug,
}

/**
 * Dokument projektu (viz buildProjectDocument).
 * @param {string} projectId
 * @param {Parameters<typeof buildProjectDocument>[2]} options
 */
export function getProjectDocument(projectId, options) {
  return buildProjectDocument(state, projectId, options)
}

/**
 * Najde entitu projektu podle kolekce a id.
 * @param {string} projectId
 * @param {string} stateKey
 * @param {string} id
 * @returns {Object|null}
 */
function findEntity(projectId, stateKey, id) {
  const list = Array.isArray(state[stateKey]) ? state[stateKey] : []
  return list.find((e) => e?.id === id && e.projectId === projectId) ?? null
}

/**
 * Uloží úpravu entity z dokumentu (jen entity daného projektu a známých typů).
 * @param {string} projectId
 * @param {string} stateKey - kolekce (např. 'personas')
 * @param {string} id
 * @param {Object} updates
 * @returns {boolean} true, pokud se něco uložilo
 */
export function updateDocumentEntity(projectId, stateKey, id, updates) {
  const update = UPDATE_BY_TYPE[stateKey]
  if (!update || !updates || !Object.keys(updates).length || !findEntity(projectId, stateKey, id)) return false
  update(id, updates)
  return true
}

/**
 * Uloží hodnotu pole entity zadanou v dokumentu; beze změny se nic neukládá (ani do historie).
 * @param {string} projectId
 * @param {string} stateKey
 * @param {string} id
 * @param {Object} field - efektivní definice pole
 * @param {string} value
 * @param {string} [unit] - jednotka u number-unit
 * @returns {boolean}
 */
export function updateDocumentField(projectId, stateKey, id, field, value, unit) {
  const entity = findEntity(projectId, stateKey, id)
  const updates = entity && entityFieldUpdate(field, entity, value, unit)
  return updates ? updateDocumentEntity(projectId, stateKey, id, updates) : false
}
