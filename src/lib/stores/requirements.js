import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createRequirement } from '../models.js'

export function getRequirements(projectId) {
  return (getData().requirements || [])
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getRequirement(id) {
  return getData().requirements?.find((r) => r.id === id) ?? null
}

export function addRequirement(projectId, overrides = {}) {
  const r = createRequirement(projectId, overrides)
  state.requirements = state.requirements || []
  state.requirements.push(r)
  // Přidat do všech scénářů
  state.scenarios?.filter((s) => s.projectId === projectId).forEach((s) => {
    if (!s.requirementIds.includes(r.id)) s.requirementIds.push(r.id)
  })
  updateProject(projectId, {})
  persist()
  return r
}

export function updateRequirement(id, updates) {
  const idx = state.requirements?.findIndex((r) => r.id === id)
  if (idx === -1) return null
  state.requirements[idx] = { ...state.requirements[idx], ...updates }
  if (state.requirements[idx].projectId) updateProject(state.requirements[idx].projectId, {})
  persist()
  return state.requirements[idx]
}

export function deleteRequirement(id) {
  state.requirements = (state.requirements || []).filter((r) => r.id !== id)
  state.stakeholders?.forEach((s) => {
    s.requirementIds = (s.requirementIds || []).filter((rid) => rid !== id)
  })
  state.hypotheses?.forEach((h) => {
    h.requirementIds = (h.requirementIds || []).filter((rid) => rid !== id)
  })
  state.personas?.forEach((p) => {
    p.requirementIds = (p.requirementIds || []).filter((rid) => rid !== id)
  })
  state.scenarios?.forEach((s) => {
    s.requirementIds = (s.requirementIds || []).filter((rid) => rid !== id)
  })
  state.requirements?.forEach((r) => {
    r.conflictingRequirementIds = (r.conflictingRequirementIds || []).filter((rid) => rid !== id)
  })
  persist()
}
