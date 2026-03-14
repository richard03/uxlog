import { persist } from './state.js'
import { getStakeholder } from './stakeholders.js'
import { getHypothesis } from './hypotheses.js'
import { getPersona } from './personas.js'
import { getScenario } from './scenarios.js'
import { getRequirement } from './requirements.js'

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
