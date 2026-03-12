/**
 * Composable pro přístup ke konfiguraci aplikace.
 * Obaluje funkce z configStore.js a poskytuje je komponentám.
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
} from '../lib/configStore.js'

export function useConfig() {
  return {
    state: configState,
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
  }
}
