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
  }
}
