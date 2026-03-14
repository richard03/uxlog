import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createCompetition } from '../models.js'

export function getCompetitions(projectId) {
  return (getData().competitions || [])
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getCompetition(id) {
  return getData().competitions?.find((c) => c.id === id) ?? null
}

export function addCompetition(projectId, overrides = {}) {
  const c = createCompetition(projectId, overrides)
  state.competitions = state.competitions || []
  state.competitions.push(c)
  updateProject(projectId, {})
  persist()
  return c
}

export function updateCompetition(id, updates) {
  const idx = state.competitions?.findIndex((c) => c.id === id)
  if (idx === -1) return null
  state.competitions[idx] = { ...state.competitions[idx], ...updates }
  if (state.competitions[idx].projectId) updateProject(state.competitions[idx].projectId, {})
  persist()
  return state.competitions[idx]
}

export function deleteCompetition(id) {
  state.competitions = (state.competitions || []).filter((c) => c.id !== id)
  persist()
}
