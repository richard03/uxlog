import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createTask } from '../models.js'
import { dropChecklistLinksPointingToTask } from '../activityChecklistLinks.js'

export function getTasks(projectId) {
  return (getData().tasks || [])
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getTask(id) {
  return getData().tasks?.find((t) => t.id === id) ?? null
}

export function addTask(projectId, overrides = {}) {
  const task = createTask(projectId, overrides)
  state.tasks = state.tasks || []
  state.tasks.push(task)
  updateProject(projectId, {})
  persist()
  return task
}

export function updateTask(id, updates) {
  const idx = state.tasks?.findIndex((t) => t.id === id)
  if (idx === -1) return null
  state.tasks[idx] = { ...state.tasks[idx], ...updates }
  if (state.tasks[idx].projectId) updateProject(state.tasks[idx].projectId, {})
  persist()
  return state.tasks[idx]
}

/**
 * Smaže úkol a z aktivit odstraní vazby checklistu, které na něj ukazovaly.
 * @param {string} id
 */
export function deleteTask(id) {
  const task = state.tasks?.find((t) => t.id === id)
  state.tasks = (state.tasks || []).filter((t) => t.id !== id)
  if (state.activities?.length) {
    state.activities = state.activities.map((a) => {
      const prev = a.checklistItemTaskIds
      if (!prev || !Object.keys(prev).length) return a
      const nextMap = dropChecklistLinksPointingToTask(prev, id)
      if (Object.keys(nextMap).length === Object.keys(prev).length) return a
      return { ...a, checklistItemTaskIds: nextMap }
    })
  }
  if (task?.projectId) updateProject(task.projectId, {})
  persist()
}
