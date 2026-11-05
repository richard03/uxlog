/**
 * Composable pro přístup ke konfiguraci.
 * Bez projektu pracuje s výchozí konfigurací (vzor pro nové projekty), s projektem s konfigurací
 * toho projektu (stores/config.js → configFor). Funkce se vyhodnocují vždy pro aktuální projekt,
 * takže fungují i při přechodu mezi projekty bez nového připojení komponenty.
 */

import { configFor } from '../lib/stores/config.js'
import { ENTITY_FIELD_DEFAULTS } from '../lib/entityFieldDefaults.js'

const FUNCTIONS = [
  'getEffectiveTemplates', 'getTemplate', 'getDeletedBuiltInTemplates', 'getEntityCustomFields',
  'addCustomTemplate', 'updateTemplate', 'deleteTemplate', 'restoreTemplate',
  'addEntityField', 'updateEntityField', 'deleteEntityField',
  'getEffectiveEntityFields', 'getHiddenBuiltInFields', 'getFieldOverride', 'updateFieldOverride', 'resetFieldOverride',
  'isFieldOverridden', 'getProjectDurationDays', 'updateProjectDurationDays', 'getTemplateDurationDays',
]

/**
 * @param {string|(() => string|null|undefined)|null} [project] - id projektu nebo funkce, která ho vrací
 *   (např. () => route.params.id); bez projektu = výchozí konfigurace
 */
export function useConfig(project = null) {
  const projectId = () => (typeof project === 'function' ? project() : project) || null
  const api = {
    get state() { return configFor(projectId()).state },
    ENTITY_FIELD_DEFAULTS,
    /** Je to konfigurace projektu (ne výchozí)? */
    get isProjectScope() { return Boolean(projectId()) },
  }
  for (const name of FUNCTIONS) api[name] = (...args) => configFor(projectId())[name](...args)
  return api
}
