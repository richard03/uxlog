/**
 * Composable pro přístup ke konfiguraci aplikace.
 * Obaluje funkce z stores/config.js a poskytuje je komponentám.
 */

import {
  configState,
  getEffectiveTemplates,
  getTemplate,
  getDeletedBuiltInTemplates,
  getEntityCustomFields,
  addCustomTemplate,
  updateTemplate,
  deleteTemplate,
  restoreTemplate,
  addEntityField,
  updateEntityField,
  deleteEntityField,
  getEffectiveEntityFields,
  getHiddenBuiltInFields,
  getFieldOverride,
  updateFieldOverride,
  resetFieldOverride,
  isFieldOverridden,
  getProjectDurationDays,
  updateProjectDurationDays,
  getTemplateDurationDays,
} from '../lib/stores/config.js'
import { ENTITY_FIELD_DEFAULTS } from '../lib/entityFieldDefaults.js'

export function useConfig() {
  return {
    state: configState,
    ENTITY_FIELD_DEFAULTS,
    getEffectiveTemplates,
    getTemplate,
    getDeletedBuiltInTemplates,
    getEntityCustomFields,
    addCustomTemplate,
    updateTemplate,
    deleteTemplate,
    restoreTemplate,
    addEntityField,
    updateEntityField,
    deleteEntityField,
    getEffectiveEntityFields,
    getHiddenBuiltInFields,
    getFieldOverride,
    updateFieldOverride,
    resetFieldOverride,
    isFieldOverridden,
    getProjectDurationDays,
    updateProjectDurationDays,
    getTemplateDurationDays,
  }
}
