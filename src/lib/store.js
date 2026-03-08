/**
 * Centrální úložiště dat aplikace.
 * Propojuje storage, modely a vyhledávání. Bez kaskádového mazání.
 * Používá Vue reactive pro automatickou reaktivitu.
 */

import { reactive, toRaw, unref } from 'vue'
import { loadData, saveData, getEmptyData } from './storage.js'
import {
  createProject,
  createGoal,
  createStakeholder,
  createCompetition,
  createHypothesis,
  createPersona,
  createScenario,
  createRequirement,
  createActivity,
  createTeamMember,
} from './models.js'
import { searchAll } from './search.js'
import { ACTIVITY_TYPES } from './activityTypes.js'

/** Reaktivní stav – Vue automaticky sleduje změny */
export const state = reactive(
  Object.assign(getEmptyData(), loadData())
)

/**
 * Inicializuje store a načte data.
 */
export function initStore() {
  const loaded = loadData()
  Object.assign(state, loaded)
  console.log('[UXLog] initStore, projektů:', state.projects?.length ?? 0)
}

/**
 * Vrátí aktuální data (pro čtení).
 * @returns {Object}
 */
export function getData() {
  return state
}

/**
 * Přihlásí listener na změnu dat (pro zpětnou kompatibilitu).
 * @param {Function} fn
 * @returns {Function} Odhlášení
 */
export function subscribe(fn) {
  return () => {}
}

function persist() {
  const raw = toRaw(state)
  saveData(raw)
  console.log('[UXLog] persist, projektů:', state.projects?.length ?? 0)
}

// --- Projects ---

export function getProjects() {
  return state.projects || []
}

export function getProject(id) {
  return state.projects?.find((p) => p.id === id) ?? null
}

export function addProject(overrides = {}) {
  const project = createProject(overrides)
  state.projects = state.projects || []
  state.projects.push(project)
  // Přidat všechny předdefinované aktivity jako výchozí
  state.activities = state.activities || []
  for (const type of ACTIVITY_TYPES) {
    state.activities.push(createActivity(project.id, {
      typeKey: type.key,
      name: type.defaultName,
      sortOrder: type.sortOrder,
    }))
  }
  console.log('[UXLog] addProject:', project.name, 'celkem projektů:', state.projects.length)
  persist()
  return project
}

export function updateProject(id, updates) {
  const idx = state.projects?.findIndex((p) => p.id === id)
  if (idx === -1) return null
  state.projects[idx] = { ...state.projects[idx], ...updates, lastWorkedAt: new Date().toISOString() }
  persist()
  return state.projects[idx]
}

export function deleteProject(id) {
  state.projects = (state.projects || []).filter((p) => p.id !== id)
  persist()
}

// --- Goals ---

export function getGoals(projectId) {
  return (getData().goals || []).filter((g) => g.projectId === projectId)
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

// --- Stakeholders ---

export function getStakeholders(projectId) {
  return (getData().stakeholders || []).filter((s) => s.projectId === projectId)
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

// --- Competitions ---

export function getCompetitions(projectId) {
  return (getData().competitions || []).filter((c) => c.projectId === projectId)
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

// --- Hypotheses ---

export function getHypotheses(projectId) {
  return (getData().hypotheses || []).filter((h) => h.projectId === projectId)
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

// --- Personas ---

export function getPersonas(projectId) {
  return (getData().personas || []).filter((p) => p.projectId === projectId)
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

// --- Scenarios ---

export function getScenarios(projectId) {
  return (getData().scenarios || []).filter((s) => s.projectId === projectId)
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

// --- Requirements ---

export function getRequirements(projectId) {
  return (getData().requirements || []).filter((r) => r.projectId === projectId)
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

// --- Activities ---

export function getActivities(projectId) {
  return (getData().activities || [])
    .filter((a) => a.projectId === projectId && !a.dismissed)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
}

export function getAllActivities(projectId) {
  return (getData().activities || []).filter((a) => a.projectId === projectId)
}

export function getActivity(id) {
  return getData().activities?.find((a) => a.id === id) ?? null
}

export function addActivity(projectId, overrides = {}) {
  const a = createActivity(projectId, overrides)
  state.activities = state.activities || []
  state.activities.push(a)
  updateProject(projectId, {})
  persist()
  return a
}

export function updateActivity(id, updates) {
  const idx = state.activities?.findIndex((a) => a.id === id)
  if (idx === -1) return null
  state.activities[idx] = { ...state.activities[idx], ...updates }
  if (state.activities[idx].projectId) updateProject(state.activities[idx].projectId, {})
  persist()
  return state.activities[idx]
}

export function deleteActivity(id) {
  const activity = state.activities?.find((a) => a.id === id)
  state.activities = (state.activities || []).filter((a) => a.id !== id)
  if (activity?.projectId) updateProject(activity.projectId, {})
  persist()
}

export function toggleChecklistItem(activityId, itemId) {
  const idx = state.activities?.findIndex((a) => a.id === activityId)
  if (idx === undefined || idx === -1) return
  const a = state.activities[idx]
  const checked = a.checkedItems || []
  const newChecked = checked.includes(itemId)
    ? checked.filter((id) => id !== itemId)
    : [...checked, itemId]
  state.activities[idx] = { ...a, checkedItems: newChecked }
  persist()
}

// --- Team Members ---

export function getTeamMembers(projectId) {
  return (getData().teamMembers || []).filter((m) => m.projectId === projectId)
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

// --- Relations (bez kaskádového mazání) ---

export function linkStakeholderRequirement(stakeholderId, requirementId) {
  const s = getStakeholder(stakeholderId)
  if (!s) return false
  s.requirementIds = s.requirementIds || []
  if (!s.requirementIds.includes(requirementId)) s.requirementIds.push(requirementId)
  persist()
  return true
}

export function unlinkStakeholderRequirement(stakeholderId, requirementId) {
  const s = getStakeholder(stakeholderId)
  if (!s) return false
  s.requirementIds = (s.requirementIds || []).filter((id) => id !== requirementId)
  persist()
  return true
}

export function linkHypothesisRequirement(hypothesisId, requirementId) {
  const h = getHypothesis(hypothesisId)
  if (!h) return false
  h.requirementIds = h.requirementIds || []
  if (!h.requirementIds.includes(requirementId)) h.requirementIds.push(requirementId)
  persist()
  return true
}

export function unlinkHypothesisRequirement(hypothesisId, requirementId) {
  const h = getHypothesis(hypothesisId)
  if (!h) return false
  h.requirementIds = (h.requirementIds || []).filter((id) => id !== requirementId)
  persist()
  return true
}

export function linkPersonaScenario(personaId, scenarioId) {
  const p = getPersona(personaId)
  if (!p) return false
  p.scenarioIds = p.scenarioIds || []
  if (!p.scenarioIds.includes(scenarioId)) p.scenarioIds.push(scenarioId)
  persist()
  return true
}

export function unlinkPersonaScenario(personaId, scenarioId) {
  const p = getPersona(personaId)
  if (!p) return false
  p.scenarioIds = (p.scenarioIds || []).filter((id) => id !== scenarioId)
  persist()
  return true
}

export function linkScenarioHypothesis(scenarioId, hypothesisId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.hypothesisIds = s.hypothesisIds || []
  if (!s.hypothesisIds.includes(hypothesisId)) s.hypothesisIds.push(hypothesisId)
  persist()
  return true
}

export function unlinkScenarioHypothesis(scenarioId, hypothesisId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.hypothesisIds = (s.hypothesisIds || []).filter((id) => id !== hypothesisId)
  persist()
  return true
}

export function linkPersonaRequirement(personaId, requirementId) {
  const p = getPersona(personaId)
  if (!p) return false
  p.requirementIds = p.requirementIds || []
  if (!p.requirementIds.includes(requirementId)) p.requirementIds.push(requirementId)
  persist()
  return true
}

export function unlinkPersonaRequirement(personaId, requirementId) {
  const p = getPersona(personaId)
  if (!p) return false
  p.requirementIds = (p.requirementIds || []).filter((id) => id !== requirementId)
  persist()
  return true
}

export function linkRequirementConflict(requirementId, conflictingId) {
  const r = getRequirement(requirementId)
  if (!r || requirementId === conflictingId) return false
  r.conflictingRequirementIds = r.conflictingRequirementIds || []
  if (!r.conflictingRequirementIds.includes(conflictingId)) r.conflictingRequirementIds.push(conflictingId)
  persist()
  return true
}

export function unlinkRequirementConflict(requirementId, conflictingId) {
  const r = getRequirement(requirementId)
  if (!r) return false
  r.conflictingRequirementIds = (r.conflictingRequirementIds || []).filter((id) => id !== conflictingId)
  persist()
  return true
}

export function linkRequirementScenario(requirementId, scenarioId) {
  const r = getRequirement(requirementId)
  if (!r) return false
  r.scenarioIds = r.scenarioIds || []
  if (!r.scenarioIds.includes(scenarioId)) r.scenarioIds.push(scenarioId)
  persist()
  return true
}

export function unlinkRequirementScenario(requirementId, scenarioId) {
  const r = getRequirement(requirementId)
  if (!r) return false
  r.scenarioIds = (r.scenarioIds || []).filter((id) => id !== scenarioId)
  persist()
  return true
}

export function linkRequirementStakeholder(requirementId, stakeholderId) {
  const r = getRequirement(requirementId)
  if (!r) return false
  r.stakeholderIds = r.stakeholderIds || []
  if (!r.stakeholderIds.includes(stakeholderId)) r.stakeholderIds.push(stakeholderId)
  persist()
  return true
}

export function unlinkRequirementStakeholder(requirementId, stakeholderId) {
  const r = getRequirement(requirementId)
  if (!r) return false
  r.stakeholderIds = (r.stakeholderIds || []).filter((id) => id !== stakeholderId)
  persist()
  return true
}

export function linkScenarioPersona(scenarioId, personaId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.personaIds = s.personaIds || []
  if (!s.personaIds.includes(personaId)) s.personaIds.push(personaId)
  persist()
  return true
}

export function unlinkScenarioPersona(scenarioId, personaId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.personaIds = (s.personaIds || []).filter((id) => id !== personaId)
  persist()
  return true
}

export function linkScenarioRequirement(scenarioId, requirementId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.requirementIds = s.requirementIds || []
  if (!s.requirementIds.includes(requirementId)) s.requirementIds.push(requirementId)
  persist()
  return true
}

export function unlinkScenarioRequirement(scenarioId, requirementId) {
  const s = getScenario(scenarioId)
  if (!s) return false
  s.requirementIds = (s.requirementIds || []).filter((id) => id !== requirementId)
  persist()
  return true
}

// --- Search ---

export function search(query, projectId) {
  return searchAll(getData(), query, projectId)
}

// --- Import ---

import { buildImportData } from './importLogic.js'

/**
 * Aplikuje importovaná data do store.
 * @param {{ projectUpdates, newProjectData, upserts, effectiveProjectId }} importData - Výstup buildImportData
 */
export function importProjectData(importData) {
  const { projectUpdates, newProjectData, upserts, effectiveProjectId } = importData
  console.log('[UXLog] importProjectData, effectiveProjectId:', effectiveProjectId)

  if (newProjectData) {
    state.projects = state.projects || []
    state.projects.push(newProjectData)
    console.log('[UXLog] created new project:', newProjectData.name)
  } else if (projectUpdates) {
    const idx = state.projects?.findIndex((p) => p.id === effectiveProjectId)
    if (idx !== undefined && idx >= 0) {
      state.projects[idx] = {
        ...state.projects[idx],
        ...projectUpdates,
        lastWorkedAt: new Date().toISOString(),
      }
    }
  }

  const entityKeys = [
    'goals', 'stakeholders', 'competitions', 'hypotheses',
    'personas', 'scenarios', 'requirements', 'activities', 'teamMembers',
  ]
  let totalUpserted = 0
  for (const key of entityKeys) {
    state[key] = state[key] || []
    for (const { finalId, prepared, existingId } of (upserts[key] || [])) {
      const idx = state[key].findIndex(
        (e) => e.id === finalId || (existingId && e.id === existingId)
      )
      if (idx >= 0) {
        console.log(`[UXLog] updated ${key}: ${prepared.code || prepared.name || finalId}`)
        state[key][idx] = prepared
      } else {
        console.log(`[UXLog] created ${key}: ${prepared.code || prepared.name || finalId}`)
        state[key].push(prepared)
      }
      totalUpserted++
    }
  }

  console.log(`[UXLog] importProjectData done, ${totalUpserted} entities upserted`)
  persist()
}

// --- Export ---

import { toYaml } from './yaml.js'

export function exportData() {
  return toYaml(getData())
}

/**
 * Exportuje data jedné sekce projektu (např. scénáře, cíle).
 * Používá stejné gettery jako zobrazení seznamu pro konzistenci.
 * @param {string} projectId - ID projektu (může být Ref, bude rozbaleno)
 * @param {string} storeKey - klíč sekce (goals, scenarios, …)
 * @returns {string} YAML řetězec
 */
export function exportSectionData(projectId, storeKey) {
  const pid = unref(projectId)
  const getters = {
    goals: getGoals,
    stakeholders: getStakeholders,
    competitions: getCompetitions,
    hypotheses: getHypotheses,
    personas: getPersonas,
    scenarios: getScenarios,
    requirements: getRequirements,
    activities: getAllActivities,
    teamMembers: getTeamMembers,
  }
  const getter = getters[storeKey]
  if (!getter) return toYaml({ [storeKey]: [] })
  const items = getter(pid)
  return toYaml({ [storeKey]: items })
}

export function exportEntityData(storeKey, entityId) {
  const data = getData()
  const entity = (data[storeKey] || []).find(e => e.id === entityId) ?? null
  return toYaml({ [storeKey]: entity ? [entity] : [] })
}

export function exportProjectData(projectId) {
  const data = getData()
  return toYaml({
    project: data.projects?.find((p) => p.id === projectId) ?? null,
    goals: (data.goals || []).filter((g) => g.projectId === projectId),
    stakeholders: (data.stakeholders || []).filter((s) => s.projectId === projectId),
    competitions: (data.competitions || []).filter((c) => c.projectId === projectId),
    hypotheses: (data.hypotheses || []).filter((h) => h.projectId === projectId),
    personas: (data.personas || []).filter((p) => p.projectId === projectId),
    scenarios: (data.scenarios || []).filter((s) => s.projectId === projectId),
    requirements: (data.requirements || []).filter((r) => r.projectId === projectId),
    activities: (data.activities || []).filter((a) => a.projectId === projectId),
    teamMembers: (data.teamMembers || []).filter((m) => m.projectId === projectId),
  })
}
