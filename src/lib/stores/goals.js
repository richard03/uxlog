import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createGoal } from '../models.js'

export function getGoals(projectId) {
  return (getData().goals || [])
    .filter((g) => g.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getGoal(id) {
  return getData().goals?.find((g) => g.id === id) ?? null
}

export function addGoal(projectId, overrides = {}) {
  const goal = createGoal(projectId, overrides)
  state.goals = state.goals || []
  state.goals.push(goal)
  updateProject(projectId, {})
  persist()
  return goal
}

export function updateGoal(id, updates) {
  const idx = state.goals?.findIndex((g) => g.id === id)
  if (idx === -1) return null
  state.goals[idx] = { ...state.goals[idx], ...updates }
  if (state.goals[idx].projectId) updateProject(state.goals[idx].projectId, {})
  persist()
  return state.goals[idx]
}

export function deleteGoal(id) {
  const goal = state.goals?.find((g) => g.id === id)
  state.goals = (state.goals || []).filter((g) => g.id !== id)
  if (goal?.projectId) updateProject(goal.projectId, {})
  persist()
}
