/**
 * Barrel re-export všech store modulů.
 * Zachovává zpětnou kompatibilitu s původním store.js.
 */

export { state, initStore, getData, subscribe } from './state.js'
export {
  getProjects, getProject, addProject, updateProject, deleteProject,
  reorderProjects, reorderEntities, moveEntityToProject,
} from './projects.js'
export { getGoals, getGoal, addGoal, updateGoal, deleteGoal } from './goals.js'
export { getStakeholders, getStakeholder, addStakeholder, updateStakeholder, deleteStakeholder } from './stakeholders.js'
export { getCompetitions, getCompetition, addCompetition, updateCompetition, deleteCompetition } from './competitions.js'
export { getHypotheses, getHypothesis, addHypothesis, updateHypothesis, deleteHypothesis } from './hypotheses.js'
export { getPersonas, getPersona, addPersona, updatePersona, deletePersona } from './personas.js'
export { getScenarios, getScenario, addScenario, updateScenario, deleteScenario } from './scenarios.js'
export { getRequirements, getRequirement, addRequirement, updateRequirement, deleteRequirement } from './requirements.js'
export {
  getActivities, getAllActivities, getActivity, addActivity, updateActivity, deleteActivity,
  toggleChecklistItem, addCustomChecklistItem, removeChecklistItem, updateChecklistLabel,
} from './activities.js'
export { getTeamMembers, getTeamMember, addTeamMember, updateTeamMember, deleteTeamMember } from './teamMembers.js'
export { getTasks, getTask, addTask, updateTask, deleteTask } from './tasks.js'
export { getBugs, getBug, addBug, updateBug, deleteBug } from './bugs.js'
export {
  linkStakeholderRequirement, unlinkStakeholderRequirement,
  linkHypothesisRequirement, unlinkHypothesisRequirement,
  linkPersonaScenario, unlinkPersonaScenario,
  linkScenarioHypothesis, unlinkScenarioHypothesis,
  linkPersonaRequirement, unlinkPersonaRequirement,
  linkRequirementConflict, unlinkRequirementConflict,
  linkRequirementScenario, unlinkRequirementScenario,
  linkRequirementStakeholder, unlinkRequirementStakeholder,
  linkScenarioPersona, unlinkScenarioPersona,
  linkScenarioRequirement, unlinkScenarioRequirement,
} from './relations.js'
export {
  exportData, exportSectionData, exportEntityData, exportProjectData,
  importProjectData, buildImport,
} from './exportImport.js'

import { searchAll } from '../search.js'
import { getData } from './state.js'
export function search(query, projectId) {
  return searchAll(getData(), query, projectId)
}
