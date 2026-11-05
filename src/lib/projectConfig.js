/**
 * Konfigurace (šablony aktivit, vlastní atributy entit, přepisy vestavěných atributů).
 *
 * Výchozí konfigurace (Konfigurace na přehledu projektů) slouží jen jako vzor pro nové projekty.
 * Každý projekt má vlastní kopii v `project.config` – vznikne při založení projektu (u starších
 * projektů při prvním spuštění) a jeho úpravy ostatní projekty ani výchozí konfiguraci neovlivní.
 * Čisté funkce.
 */

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Prázdná konfigurace.
 * @returns {Object}
 */
export function getEmptyConfig() {
  return {
    activityTemplateOverrides: {},
    customActivityTemplates: [],
    entityCustomFields: {},
    entityFieldOverrides: {},
  }
}

/** Zrušené části konfigurace, které se při čtení zahodí (délky projektů – termín projektu už není). */
const REMOVED_CONFIG_KEYS = ['projectDurationDays']

/**
 * Normalizuje uloženou konfiguraci (tolerantní k poškozeným a starším datům):
 * chybějící nebo neplatné části nahradí výchozími.
 * @param {unknown} raw
 * @returns {Object} nový objekt (vstup se nemění)
 */
export function normalizeConfig(raw) {
  const empty = getEmptyConfig()
  if (!isObject(raw)) return empty
  const copy = JSON.parse(JSON.stringify(raw))
  for (const key of REMOVED_CONFIG_KEYS) delete copy[key]
  return {
    ...copy,
    activityTemplateOverrides: isObject(copy.activityTemplateOverrides) ? copy.activityTemplateOverrides : empty.activityTemplateOverrides,
    customActivityTemplates: Array.isArray(copy.customActivityTemplates) ? copy.customActivityTemplates.filter(isObject) : empty.customActivityTemplates,
    entityCustomFields: isObject(copy.entityCustomFields) ? copy.entityCustomFields : empty.entityCustomFields,
    entityFieldOverrides: isObject(copy.entityFieldOverrides) ? copy.entityFieldOverrides : empty.entityFieldOverrides,
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
