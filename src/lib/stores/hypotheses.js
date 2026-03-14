import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createHypothesis } from '../models.js'

export function getHypotheses(projectId) {
  return (getData().hypotheses || [])
    .filter((h) => h.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getHypothesis(id) {
  return getData().hypotheses?.find((h) => h.id === id) ?? null
}

export function addHypothesis(projectId, overrides = {}) {
  const h = createHypothesis(projectId, overrides)
  state.hypotheses = state.hypotheses || []
  state.hypotheses.push(h)
  updateProject(projectId, {})
  persist()
  return h
}

export function updateHypothesis(id, updates) {
  const idx = state.hypotheses?.findIndex((h) => h.id === id)
  if (idx === -1) return null
  state.hypotheses[idx] = { ...state.hypotheses[idx], ...updates }
  if (state.hypotheses[idx].projectId) updateProject(state.hypotheses[idx].projectId, {})
  persist()
  return state.hypotheses[idx]
}

export function deleteHypothesis(id) {
  state.hypotheses = (state.hypotheses || []).filter((h) => h.id !== id)
  persist()
}
