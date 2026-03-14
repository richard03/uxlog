import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createTask } from '../models.js'

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

export function deleteTask(id) {
  const task = state.tasks?.find((t) => t.id === id)
  state.tasks = (state.tasks || []).filter((t) => t.id !== id)
  if (task?.projectId) updateProject(task.projectId, {})
  persist()
}
