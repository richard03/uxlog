import { state, persist } from './state.js'
import { createProject, createActivity } from '../models.js'
import { generateId } from '../id.js'
import { getEffectiveTemplates } from './config.js'
import { todayISO, addDays } from '../deadline.js'
import { pickProjectColor } from '../projectColors.js'
import { createNotebookEntry, appendNotebookEntry, updateNotebookEntry, getNotebookHistory } from '../notebookChat.js'
import { cardKey, removeCanvasCards } from '../canvas.js'

export function getProjects() {
  return [...(state.projects || [])].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getProject(id) {
  return state.projects?.find((p) => p.id === id) ?? null
}

export function addProject(overrides = {}) {
  const usedColors = (state.projects || []).map((p) => p.color).filter(Boolean)
  const color = overrides.color || pickProjectColor(usedColors)

  const templates = getEffectiveTemplates().filter((t) => t.createOnNewProject)
  const today = todayISO()
  const totalDays = templates.reduce((sum, t) => sum + (t.defaultDurationDays || 0), 0)
  const deadline = overrides.deadline || (totalDays > 0 ? addDays(today, totalDays) : '')

  const project = createProject({ color, deadline, ...overrides })
  state.projects = state.projects || []
  state.projects.push(project)

  state.activities = state.activities || []
  let cumulativeDays = 0
  for (const template of templates) {
    cumulativeDays += template.defaultDurationDays || 0
    const activityDeadline = cumulativeDays > 0 ? addDays(today, cumulativeDays) : ''
    state.activities.push(createActivity(project.id, {
      typeKey: template.key,
      name: template.name,
      sortOrder: template.sortOrder,
      baseChecklist: template.checklist ? [...template.checklist] : [],
      deadline: activityDeadline,
    }))
  }
  console.log('[UXLog] addProject:', project.name, 'celkem projektů:', state.projects.length)
  persist()
  return project
}

export function updateProject(id, updates) {
  const idx = state.projects?.findIndex((p) => p.id === id)
  if (idx === -1) return null
  state.projects[idx] = { ...state.projects[idx], ...updates, lastWorkedAt: new Date().toISOString() }
  persist()
  return state.projects[idx]
}

/**
 * Normalizovaná historie zápisníku projektu (od nejstarší zprávy).
 * @param {string} projectId
 * @returns {Array<Object>}
 */
export function getProjectNotebookHistory(projectId) {
  return getNotebookHistory(getProject(projectId))
}

/**
 * Přidá zprávu do historie zápisníku projektu.
 * @param {string} projectId
 * @param {string} text
 * @param {string} status - 'processing' (čeká na AI) nebo 'saved' (bez AI)
 * @param {'process'|'ask'} mode - „Vložit informace“ nebo „Zeptat se“
 * @returns {Object|null} vytvořený záznam
 */
export function addNotebookEntry(projectId, text, status = 'processing', mode = 'process') {
  const project = getProject(projectId)
  if (!project) return null
  const entry = createNotebookEntry(text, { id: generateId(), status, mode })
  updateProject(projectId, appendNotebookEntry(project, entry))
  return entry
}

/**
 * Aktualizuje záznam v historii zápisníku projektu.
 * @param {string} projectId
 * @param {string} entryId
 * @param {Object} updates
 */
export function updateNotebookEntryInProject(projectId, entryId, updates) {
  const project = getProject(projectId)
  if (!project) return
  updateProject(projectId, updateNotebookEntry(project, entryId, updates))
}

const PROJECT_ENTITY_KEYS = [
  'goals', 'stakeholders', 'competitions', 'hypotheses', 'personas',
  'scenarios', 'requirements', 'activities', 'teamMembers', 'tasks', 'bugs', 'risks', 'connections',
]

export function deleteProject(id) {
  state.projects = (state.projects || []).filter((p) => p.id !== id)
  for (const key of PROJECT_ENTITY_KEYS) {
    if (state[key]) state[key] = state[key].filter((e) => e.projectId !== id)
  }
  persist()
}

export function reorderProjects(orderedIds) {
  reorderEntities('projects', null, orderedIds)
}

// Importováno z relations/general – definováno zde, aby nevznikl cyklický import
export function reorderEntities(stateKey, projectId, orderedIds) {
  const items = state[stateKey] || []
  orderedIds.forEach((id, i) => {
    const item = items.find((e) => e.id === id && (projectId === null || e.projectId === projectId))
    if (item) item.sortOrder = i * 10
  })
  persist()
}

export function moveEntityToProject(stateKey, entityId, targetProjectId) {
  const items = state[stateKey] || []
  const item = items.find((e) => e.id === entityId)
  if (!item) return false
  const sourceProjectId = item.projectId
  item.projectId = targetProjectId
  // Pozice a barva kartičky na plátně patří zdrojovému projektu – v cílovém dostane výchozí místo
  const source = sourceProjectId && sourceProjectId !== targetProjectId ? getProject(sourceProjectId) : null
  if (source?.canvas) source.canvas = removeCanvasCards(source.canvas, [cardKey(stateKey, entityId)])
  if (sourceProjectId) updateProject(sourceProjectId, {})
  updateProject(targetProjectId, {})
  persist()
  return true
}

/**
 * Přesune více entit do jiného projektu (jedna akce = jeden záznam historie).
 * @param {Array<{ stateKey: string, id: string }>} entities
 * @param {string} targetProjectId
 * @returns {number} počet přesunutých entit
 */
export function moveEntitiesToProject(entities, targetProjectId) {
  if (!targetProjectId || !getProject(targetProjectId)) return 0
  let moved = 0
  for (const e of entities || []) {
    if (e?.stateKey && e.id && moveEntityToProject(e.stateKey, e.id, targetProjectId)) moved++
  }
  return moved
}

/**
 * Zkopíruje více entit do jiného projektu.
 * @param {Array<{ stateKey: string, id: string }>} entities
 * @param {string} targetProjectId
 * @returns {Array<Object>} vytvořené kopie
 */
export function copyEntitiesToProject(entities, targetProjectId) {
  if (!targetProjectId || !getProject(targetProjectId)) return []
  const copies = []
  for (const e of entities || []) {
    const copy = e?.stateKey && e.id ? copyEntityToProject(e.stateKey, e.id, targetProjectId) : null
    if (copy) copies.push(copy)
  }
  return copies
}

export function copyEntityToProject(stateKey, entityId, targetProjectId) {
  const items = state[stateKey] || []
  const item = items.find((e) => e.id === entityId)
  if (!item) return null
  const copy = JSON.parse(JSON.stringify(item))
  copy.id = generateId()
  copy.projectId = targetProjectId
  state[stateKey].push(copy)
  updateProject(targetProjectId, {})
  persist()
  return copy
}
