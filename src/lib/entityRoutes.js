/**
 * Detailové routy entit projektu podle klíče ve state – čisté funkce.
 */

/** Klíč ve state → [název routy detailu, název parametru s id entity]. */
export const ENTITY_DETAIL_ROUTES = {
  goals: ['goalDetail', 'goalId'],
  stakeholders: ['stakeholderDetail', 'stakeholderId'],
  competitions: ['competitionDetail', 'competitionId'],
  hypotheses: ['hypothesisDetail', 'hypothesisId'],
  personas: ['personaDetail', 'personaId'],
  scenarios: ['scenarioDetail', 'scenarioId'],
  requirements: ['requirementDetail', 'requirementId'],
  tasks: ['taskDetail', 'taskId'],
  bugs: ['bugDetail', 'bugId'],
  risks: ['riskDetail', 'riskId'],
  teamMembers: ['teamMemberDetail', 'memberId'],
  activities: ['activityDetail', 'activityId'],
}

/**
 * Cíl router-linku na detail entity; pro neznámý typ nebo chybějící id null.
 * @param {string} type - klíč ve state (např. 'personas')
 * @param {string} projectId
 * @param {string} id
 * @returns {{ name: string, params: Object }|null}
 */
export function entityDetailRoute(type, projectId, id) {
  const entry = ENTITY_DETAIL_ROUTES[type]
  if (!entry || !projectId || !id) return null
  const [name, param] = entry
  return { name, params: { id: projectId, [param]: id } }
}
