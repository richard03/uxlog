/**
 * Store modul pro změnu typu entity (např. požadavek → scénář).
 *
 * Vznikne nový záznam cílového typu (hodnoty z dialogu Změnit typ), souvislosti původního záznamu
 * se přesměrují na nový, kartička na plátně zůstane na místě i s barvou a původní záznam se smaže
 * běžnou funkcí delete* (úklid vazeb). Vše v jedné synchronní akci = jeden záznam historie,
 * který jde vrátit.
 */

import { state, persist } from './state.js'
import { updateProject } from './projects.js'
import { DELETE_BY_TYPE } from './canvas.js'
import {
  createGoal, createStakeholder, createCompetition, createHypothesis, createRisk,
  createPersona, createScenario, createRequirement, createTask, createBug,
} from '../models.js'
import { isConvertibleCollection, retargetConnections } from '../entityConversion.js'
import { cardKey, renameCanvasCard } from '../canvas.js'

/** Továrny nových záznamů podle kolekce (výchozí hodnoty z data/entities.yaml). */
const CREATE_BY_TYPE = {
  goals: createGoal,
  stakeholders: createStakeholder,
  competitions: createCompetition,
  hypotheses: createHypothesis,
  risks: createRisk,
  personas: createPersona,
  scenarios: createScenario,
  requirements: createRequirement,
  tasks: createTask,
  bugs: createBug,
}

/** Pole, která návrh z dialogu nesmí přepsat. */
const PROTECTED_FIELDS = ['id', 'projectId', 'createdAt', 'updatedAt']

/**
 * Převede záznam na jiný typ.
 * @param {string} fromCollection - kolekce původního záznamu (např. 'requirements')
 * @param {string} id - id původního záznamu
 * @param {string} toCollection - cílová kolekce (např. 'scenarios')
 * @param {Object} values - hodnoty nového záznamu (name, code, pole typu, customFields)
 * @returns {Object|null} nový záznam; null = převod nejde (neznámý záznam nebo typ)
 */
export function convertEntity(fromCollection, id, toCollection, values = {}) {
  if (fromCollection === toCollection) return null
  if (!isConvertibleCollection(fromCollection) || !isConvertibleCollection(toCollection)) return null
  const create = CREATE_BY_TYPE[toCollection]
  const remove = DELETE_BY_TYPE[fromCollection]
  const source = (state[fromCollection] || []).find((e) => e?.id === id)
  if (!create || !remove || !source) return null

  const overrides = { ...(values && typeof values === 'object' ? values : {}) }
  for (const key of PROTECTED_FIELDS) delete overrides[key]
  if (overrides.customFields && typeof overrides.customFields !== 'object') delete overrides.customFields

  // Pořadí v seznamu: na konec cílového typu (výchozí sortOrder z factory)
  const target = create(source.projectId, overrides)
  state[toCollection] = state[toCollection] || []
  state[toCollection].push(target)

  state.connections = retargetConnections(state.connections, { type: fromCollection, id }, { type: toCollection, id: target.id })

  const project = state.projects?.find((p) => p.id === source.projectId)
  if (project?.canvas) {
    project.canvas = renameCanvasCard(project.canvas, cardKey(fromCollection, id), cardKey(toCollection, target.id))
  }

  remove(id)
  if (source.projectId) updateProject(source.projectId, {})
  persist()
  return target
}
