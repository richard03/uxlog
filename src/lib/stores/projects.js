import { state, persist } from './state.js'
import { createProject, createActivity } from '../models.js'
import { getEffectiveTemplates } from '../configStore.js'
import { todayISO, addDays } from '../deadline.js'
import { pickProjectColor } from '../projectColors.js'

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

export function deleteProject(id) {
  state.projects = (state.projects || []).filter((p) => p.id !== id)
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
  if (sourceProjectId) updateProject(sourceProjectId, {})
  updateProject(targetProjectId, {})
  persist()
  return true
}
