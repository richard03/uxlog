import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createRisk } from '../models.js'

export function getRisks(projectId) {
  return (getData().risks || [])
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getRisk(id) {
  return getData().risks?.find((r) => r.id === id) ?? null
}

export function addRisk(projectId, overrides = {}) {
  const r = createRisk(projectId, overrides)
  state.risks = state.risks || []
  state.risks.push(r)
  updateProject(projectId, {})
  persist()
  return r
}

export function updateRisk(id, updates) {
  const idx = state.risks?.findIndex((r) => r.id === id)
  if (idx === undefined || idx === -1) return null
  state.risks[idx] = { ...state.risks[idx], ...updates }
  if (state.risks[idx].projectId) updateProject(state.risks[idx].projectId, {})
  persist()
  return state.risks[idx]
}

export function deleteRisk(id) {
  state.risks = (state.risks || []).filter((r) => r.id !== id)
  persist()
}
