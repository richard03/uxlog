/**
 * Konfigurace (šablony aktivit, vlastní atributy entit, přepisy vestavěných atributů, délky projektů).
 *
 * Výchozí konfigurace (Konfigurace na přehledu projektů) slouží jen jako vzor pro nové projekty.
 * Každý projekt má vlastní kopii v `project.config` – vznikne při založení projektu (u starších
 * projektů při prvním spuštění) a jeho úpravy ostatní projekty ani výchozí konfiguraci neovlivní.
 * Čisté funkce.
 */

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Prázdná konfigurace.
 * @param {Object} [projectDurationDays] - výchozí délky projektů (data/app.yaml)
 * @returns {Object}
 */
export function getEmptyConfig(projectDurationDays = {}) {
  return {
    activityTemplateOverrides: {},
    customActivityTemplates: [],
    entityCustomFields: {},
    entityFieldOverrides: {},
    projectDurationDays: { ...projectDurationDays },
  }
}

/**
 * Normalizuje uloženou konfiguraci (tolerantní k poškozeným a starším datům):
 * chybějící nebo neplatné části nahradí výchozími.
 * @param {unknown} raw
 * @param {Object} [projectDurationDays]
 * @returns {Object} nový objekt (vstup se nemění)
 */
export function normalizeConfig(raw, projectDurationDays = {}) {
  const empty = getEmptyConfig(projectDurationDays)
  if (!isObject(raw)) return empty
  const copy = JSON.parse(JSON.stringify(raw))
  return {
    ...copy,
    activityTemplateOverrides: isObject(copy.activityTemplateOverrides) ? copy.activityTemplateOverrides : empty.activityTemplateOverrides,
    customActivityTemplates: Array.isArray(copy.customActivityTemplates) ? copy.customActivityTemplates.filter(isObject) : empty.customActivityTemplates,
    entityCustomFields: isObject(copy.entityCustomFields) ? copy.entityCustomFields : empty.entityCustomFields,
    entityFieldOverrides: isObject(copy.entityFieldOverrides) ? copy.entityFieldOverrides : empty.entityFieldOverrides,
    projectDurationDays: { ...empty.projectDurationDays, ...(isObject(copy.projectDurationDays) ? copy.projectDurationDays : {}) },
  }
}

/**
 * Doplní projektům bez vlastní konfigurace kopii výchozí konfigurace.
 * @param {Object} data - stav aplikace (mění se na místě)
 * @param {() => Object} createConfig - vrací novou kopii výchozí konfigurace
 * @returns {number} počet doplněných projektů
 */
export function fillMissingProjectConfigs(data, createConfig) {
  let filled = 0
  if (typeof createConfig !== 'function') return filled
  for (const project of Array.isArray(data?.projects) ? data.projects : []) {
    if (isObject(project) && project.id && !isObject(project.config)) {
      project.config = createConfig()
      filled++
    }
  }
  return filled
}
