import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createScenario } from '../models.js'

export function getScenarios(projectId) {
  return (getData().scenarios || [])
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getScenario(id) {
  return getData().scenarios?.find((s) => s.id === id) ?? null
}

export function addScenario(projectId, overrides = {}) {
  const s = createScenario(projectId, overrides)
  state.scenarios = state.scenarios || []
  state.scenarios.push(s)
  // Přidat do všech person
  state.personas?.filter((p) => p.projectId === projectId).forEach((p) => {
    if (!p.scenarioIds.includes(s.id)) p.scenarioIds.push(s.id)
  })
  // Přidat do všech requirements
  state.requirements?.filter((r) => r.projectId === projectId).forEach((r) => {
    if (!r.scenarioIds.includes(s.id)) r.scenarioIds.push(s.id)
  })
  updateProject(projectId, {})
  persist()
  return s
}

export function updateScenario(id, updates) {
  const idx = state.scenarios?.findIndex((s) => s.id === id)
  if (idx === -1) return null
  state.scenarios[idx] = { ...state.scenarios[idx], ...updates }
  if (state.scenarios[idx].projectId) updateProject(state.scenarios[idx].projectId, {})
  persist()
  return state.scenarios[idx]
}

export function deleteScenario(id) {
  state.scenarios = (state.scenarios || []).filter((s) => s.id !== id)
  state.personas?.forEach((p) => {
    p.scenarioIds = (p.scenarioIds || []).filter((sid) => sid !== id)
  })
  state.requirements?.forEach((r) => {
    r.scenarioIds = (r.scenarioIds || []).filter((sid) => sid !== id)
  })
  persist()
}
