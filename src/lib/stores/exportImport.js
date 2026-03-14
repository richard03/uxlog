import { unref } from 'vue'
import { state, getData, persist } from './state.js'
import { toYaml } from '../yaml.js'
import { buildImportData } from '../importLogic.js'
import {
  getGoals, getStakeholders, getCompetitions, getHypotheses,
  getPersonas, getScenarios, getRequirements, getTeamMembers,
  getTasks, getBugs,
} from './index.js'
import { getAllActivities } from './activities.js'

export function exportData() {
  return toYaml(getData())
}

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
    tasks: getTasks,
    bugs: getBugs,
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
    tasks: (data.tasks || []).filter((t) => t.projectId === projectId),
    bugs: (data.bugs || []).filter((b) => b.projectId === projectId),
  })
}

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
    'tasks', 'bugs',
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

export function buildImport(parsedData, options) {
  return buildImportData(parsedData, getData(), options)
}
