import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createBug } from '../models.js'

export function getBugs(projectId) {
  return (getData().bugs || [])
    .filter((b) => b.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getBug(id) {
  return getData().bugs?.find((b) => b.id === id) ?? null
}

export function addBug(projectId, overrides = {}) {
  const bug = createBug(projectId, overrides)
  state.bugs = state.bugs || []
  state.bugs.push(bug)
  updateProject(projectId, {})
  persist()
  return bug
}

export function updateBug(id, updates) {
  const idx = state.bugs?.findIndex((b) => b.id === id)
  if (idx === -1) return null
  state.bugs[idx] = { ...state.bugs[idx], ...updates }
  if (state.bugs[idx].projectId) updateProject(state.bugs[idx].projectId, {})
  persist()
  return state.bugs[idx]
}

export function deleteBug(id) {
  const bug = state.bugs?.find((b) => b.id === id)
  state.bugs = (state.bugs || []).filter((b) => b.id !== id)
  if (bug?.projectId) updateProject(bug.projectId, {})
  persist()
}
