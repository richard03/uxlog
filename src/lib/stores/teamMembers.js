import { state, getData, persist } from './state.js'
import { updateProject } from './projects.js'
import { createTeamMember } from '../models.js'

export function getTeamMembers(projectId) {
  return (getData().teamMembers || [])
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getTeamMember(id) {
  return getData().teamMembers?.find((m) => m.id === id) ?? null
}

export function addTeamMember(projectId, overrides = {}) {
  const m = createTeamMember(projectId, overrides)
  state.teamMembers = state.teamMembers || []
  state.teamMembers.push(m)
  updateProject(projectId, {})
  persist()
  return m
}

export function updateTeamMember(id, updates) {
  const idx = state.teamMembers?.findIndex((m) => m.id === id)
  if (idx === -1) return null
  state.teamMembers[idx] = { ...state.teamMembers[idx], ...updates }
  if (state.teamMembers[idx].projectId) updateProject(state.teamMembers[idx].projectId, {})
  persist()
  return state.teamMembers[idx]
}

export function deleteTeamMember(id) {
  const member = state.teamMembers?.find((m) => m.id === id)
  state.teamMembers = (state.teamMembers || []).filter((m) => m.id !== id)
  if (member?.projectId) updateProject(member.projectId, {})
  persist()
}
