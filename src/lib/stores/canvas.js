/**
 * Store modul pro plátno projektu (Canvas) – rozvržení kartiček je uložené na projektu (pole `canvas`).
 * Posun kartiček, jejich barva a pohled nemění lastWorkedAt projektu a nezapisují se do historie
 * (pole `canvas` je v HISTORY_IGNORED_FIELDS). Mazání entit z plátna jde přes jejich běžné
 * delete* funkce, takže se do historie zapíše (a jde vrátit) jako jakékoli jiné smazání.
 */

import { state, persist } from './state.js'
import {
  collectCanvasEntities, placeCards, normalizeCanvasLayout, normalizeViewport,
  setCardPositions, pruneCanvasLayout, setCardColors, parseCardKey,
} from '../canvas.js'
import { deleteGoal } from './goals.js'
import { deleteStakeholder } from './stakeholders.js'
import { deleteTeamMember } from './teamMembers.js'
import { deleteCompetition } from './competitions.js'
import { deleteHypothesis } from './hypotheses.js'
import { deletePersona } from './personas.js'
import { deleteScenario } from './scenarios.js'
import { deleteRequirement } from './requirements.js'
import { deleteRisk } from './risks.js'
import { deleteActivity } from './activities.js'
import { deleteTask } from './tasks.js'
import { deleteBug } from './bugs.js'

/** Mazání entity podle typu kartičky – stejné funkce jako v detailu (včetně úklidu vazeb). */
const DELETE_BY_TYPE = {
  goals: deleteGoal,
  stakeholders: deleteStakeholder,
  teamMembers: deleteTeamMember,
  competitions: deleteCompetition,
  hypotheses: deleteHypothesis,
  personas: deletePersona,
  scenarios: deleteScenario,
  requirements: deleteRequirement,
  risks: deleteRisk,
  activities: deleteActivity,
  tasks: deleteTask,
  bugs: deleteBug,
}

function findProject(projectId) {
  return state.projects?.find((p) => p.id === projectId) ?? null
}

/**
 * Normalizované rozvržení plátna projektu.
 * @param {string} projectId
 * @returns {{ positions: Object, viewport: Object }}
 */
export function getCanvasLayout(projectId) {
  return normalizeCanvasLayout(findProject(projectId)?.canvas)
}

/**
 * Kartičky plátna projektu s pozicemi.
 * @param {string} projectId
 * @returns {Array<Object>}
 */
export function getCanvasCards(projectId) {
  return placeCards(collectCanvasEntities(state, projectId), getCanvasLayout(projectId))
}

/**
 * Uloží novou pozici kartičky (a zahodí pozice smazaných entit).
 * @param {string} projectId
 * @param {string} key - klíč kartičky
 * @param {{ x: number, y: number }} pos
 */
export function moveCanvasCard(projectId, key, pos) {
  moveCanvasCards(projectId, { [key]: pos })
}

/**
 * Uloží nové pozice více kartiček najednou (posun vybrané skupiny) – jedno uložení.
 * @param {string} projectId
 * @param {Object<string, {x: number, y: number}>} moves - klíč kartičky → nová pozice
 */
export function moveCanvasCards(projectId, moves) {
  const project = findProject(projectId)
  if (!project || !moves || !Object.keys(moves).length) return
  const existingKeys = collectCanvasEntities(state, projectId).map((e) => e.key)
  project.canvas = pruneCanvasLayout(setCardPositions(project.canvas, moves), existingKeys)
  persist()
}

/**
 * Uloží pohled na plátno (posun + zoom), aby se po návratu otevřelo na stejném místě.
 * @param {string} projectId
 * @param {{ x: number, y: number, zoom: number }} viewport
 */
export function setCanvasViewport(projectId, viewport) {
  const project = findProject(projectId)
  if (!project) return
  const layout = normalizeCanvasLayout(project.canvas)
  const next = normalizeViewport(viewport)
  if (JSON.stringify(layout.viewport) === JSON.stringify(next)) return
  project.canvas = { ...layout, viewport: next }
  persist()
}

/**
 * Nastaví barvu kartiček (null = výchozí barvy motivu). Mění jen vzhled plátna, ne entity.
 * @param {string} projectId
 * @param {string[]} keys - klíče kartiček
 * @param {string|null} color - hex barva
 */
export function setCanvasCardColor(projectId, keys, color) {
  const project = findProject(projectId)
  if (!project || !keys?.length) return
  const next = setCardColors(project.canvas, keys, color)
  if (JSON.stringify(normalizeCanvasLayout(project.canvas).colors) === JSON.stringify(next.colors)) return
  project.canvas = next
  persist()
}

/**
 * Smaže entity vybraných kartiček (jen entity tohoto projektu) a uklidí jejich rozvržení.
 * Vše proběhne v jedné synchronní akci, takže historie z toho udělá jeden záznam.
 * @param {string} projectId
 * @param {string[]} keys - klíče kartiček
 * @returns {number} počet smazaných entit
 */
export function deleteCanvasCards(projectId, keys) {
  const project = findProject(projectId)
  if (!project || !keys?.length) return 0
  let deleted = 0
  for (const key of keys) {
    const parsed = parseCardKey(key)
    const remove = parsed && DELETE_BY_TYPE[parsed.stateKey]
    const entity = parsed && state[parsed.stateKey]?.find((e) => e.id === parsed.id)
    if (!remove || !entity || entity.projectId !== projectId) continue
    remove(parsed.id)
    deleted++
  }
  if (deleted) {
    const existingKeys = collectCanvasEntities(state, projectId).map((e) => e.key)
    project.canvas = pruneCanvasLayout(project.canvas, existingKeys)
    persist()
  }
  return deleted
}
