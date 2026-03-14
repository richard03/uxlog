import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createPersona } from '../models.js'

export function getPersonas(projectId) {
  return (getData().personas || [])
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getPersona(id) {
  return getData().personas?.find((p) => p.id === id) ?? null
}

export function addPersona(projectId, overrides = {}) {
  const p = createPersona(projectId, overrides)
  state.personas = state.personas || []
  state.personas.push(p)
  updateProject(projectId, {})
  persist()
  return p
}

export function updatePersona(id, updates) {
  const idx = state.personas?.findIndex((p) => p.id === id)
  if (idx === -1) return null
  state.personas[idx] = { ...state.personas[idx], ...updates }
  if (state.personas[idx].projectId) updateProject(state.personas[idx].projectId, {})
  persist()
  return state.personas[idx]
}

export function deletePersona(id) {
  state.personas = (state.personas || []).filter((p) => p.id !== id)
  persist()
}
