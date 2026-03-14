import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createStakeholder } from '../models.js'

export function getStakeholders(projectId) {
  return (getData().stakeholders || [])
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getStakeholder(id) {
  return getData().stakeholders?.find((s) => s.id === id) ?? null
}

export function addStakeholder(projectId, overrides = {}) {
  const s = createStakeholder(projectId, overrides)
  state.stakeholders = state.stakeholders || []
  state.stakeholders.push(s)
  updateProject(projectId, {})
  persist()
  return s
}

export function updateStakeholder(id, updates) {
  const idx = state.stakeholders?.findIndex((s) => s.id === id)
  if (idx === -1) return null
  state.stakeholders[idx] = { ...state.stakeholders[idx], ...updates }
  if (state.stakeholders[idx].projectId) updateProject(state.stakeholders[idx].projectId, {})
  persist()
  return state.stakeholders[idx]
}

export function deleteStakeholder(id) {
  state.stakeholders = (state.stakeholders || []).filter((s) => s.id !== id)
  persist()
}
