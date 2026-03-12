<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.config.title }}</h1>
    </header>

    <!-- Section 1: Activity Templates -->
    <section class="config-section" aria-labelledby="templates-heading">
      <div class="section-header">
        <h2 id="templates-heading">{{ t.config.activityTemplates }}</h2>
        <button type="button" class="btn btn-primary btn-sm" @click="openAddTemplate">
          {{ t.config.addTemplate }}
        </button>
      </div>

      <div class="table-wrapper" role="region" :aria-label="t.config.activityTemplates">
        <table class="config-table">
          <thead>
            <tr>
              <th>{{ t.config.templateName }}</th>
              <th>{{ t.config.templateGroup }}</th>
              <th>{{ t.config.createOnNewProject }}</th>
              <th><span class="visually-hidden">{{ t.common.actions }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tpl in activeTemplates" :key="tpl.key">
              <td>{{ tpl.name }}</td>
              <td>
                <span class="group-badge" :class="`group-${tpl.group}`">
                  {{ t.config.groupLabels[tpl.group] || tpl.group }}
                </span>
              </td>
              <td>
                <input
                  type="checkbox"
                  :checked="tpl.createOnNewProject"
                  @change="toggleCreateOnNewProject(tpl)"
                  :aria-label="t.config.createOnNewProject"
                />
              </td>
              <td class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="openEditTemplate(tpl)">
                  {{ t.config.editTemplate }}
                </button>
                <button type="button" class="btn btn-ghost btn-sm danger-btn" @click="confirmDeleteTemplate(tpl)">
                  {{ t.config.deleteTemplate }}
                </button>
              </td>
            </tr>
            <tr v-if="activeTemplates.length === 0">
              <td colspan="4" class="empty-row">{{ t.common.empty }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <details class="deleted-section" v-if="deletedTemplates.length > 0">
        <summary class="deleted-summary">{{ t.config.deletedTemplates }} ({{ deletedTemplates.length }})</summary>
        <ul class="deleted-list" role="list">
          <li v-for="tpl in deletedTemplates" :key="tpl.key" class="deleted-item">
            <span class="deleted-name">{{ tpl.name }}</span>
            <span class="group-badge" :class="`group-${tpl.group}`">{{ t.config.groupLabels[tpl.group] || tpl.group }}</span>
            <button type="button" class="btn btn-secondary btn-sm" @click="config.restoreTemplate(tpl.key)">
              {{ t.config.restoreTemplate }}
            </button>
          </li>
        </ul>
      </details>
      <p v-else class="no-deleted">{{ t.config.noDeletedTemplates }}</p>
    </section>

    <!-- Section 2: Entity Attributes (built-in + custom) -->
    <section class="config-section" aria-labelledby="fields-heading">
      <div class="section-header">
        <h2 id="fields-heading">{{ t.config.entityFields }}</h2>
        <button type="button" class="btn btn-primary btn-sm" @click="openAddField">
          {{ t.config.addField }}
        </button>
      </div>

      <div class="form-group entity-type-select-group">
        <label for="entity-type-select">{{ t.config.entityTypeSelect }}</label>
        <select id="entity-type-select" v-model="selectedEntityType" class="form-control entity-type-select">
          <option v-for="(label, key) in t.config.entityTypes" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>

      <div class="table-wrapper" role="region" :aria-label="t.config.entityFields">
        <table class="config-table">
          <thead>
            <tr>
              <th>{{ t.config.fieldLabel }}</th>
              <th>{{ t.config.fieldType }}</th>
              <th>{{ t.config.fieldSortOrder }}</th>
              <th>{{ t.config.fieldSource }}</th>
              <th><span class="visually-hidden">{{ t.common.actions }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in currentEffectiveFields" :key="field.key" :class="{ 'row-overridden': field.builtIn && isOverridden(field.key) }">
              <td>
                {{ field.label }}
                <span v-if="field.builtIn && isOverridden(field.key)" class="modified-badge">{{ t.config.fieldModified }}</span>
              </td>
              <td>
                <span class="type-badge">{{ fieldTypeLabel(field.type) }}</span>
              </td>
              <td>{{ field.sortOrder }}</td>
              <td>
                <span class="source-badge" :class="field.builtIn ? 'source-builtin' : 'source-custom'">
                  {{ field.builtIn ? t.config.fieldSourceBuiltIn : t.config.fieldSourceCustom }}
                </span>
              </td>
              <td class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="field.builtIn ? openEditBuiltIn(field) : openEditField(field)">
                  {{ t.config.editField }}
                </button>
                <button v-if="field.builtIn" type="button" class="btn btn-ghost btn-sm danger-btn" @click="hideBuiltInField(field.key)">
                  {{ t.config.hideField }}
                </button>
                <button v-if="field.builtIn && isOverridden(field.key)" type="button" class="btn btn-ghost btn-sm" @click="confirmResetBuiltIn(field)">
                  {{ t.config.resetField }}
                </button>
                <button v-if="field.isCustom" type="button" class="btn btn-ghost btn-sm danger-btn" @click="confirmDeleteField(field)">
                  {{ t.config.deleteField }}
                </button>
              </td>
            </tr>
            <tr v-if="currentEffectiveFields.length === 0">
              <td colspan="5" class="empty-row">{{ t.config.noFields }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Hidden built-in fields -->
      <details class="deleted-section" v-if="currentHiddenFields.length > 0">
        <summary class="deleted-summary">{{ t.config.hiddenFields }} ({{ currentHiddenFields.length }})</summary>
        <ul class="deleted-list" role="list">
          <li v-for="field in currentHiddenFields" :key="field.key" class="deleted-item">
            <span class="deleted-name">{{ field.label }}</span>
            <span class="type-badge">{{ fieldTypeLabel(field.type) }}</span>
            <button type="button" class="btn btn-secondary btn-sm" @click="showBuiltInField(field.key)">
              {{ t.config.showField }}
            </button>
          </li>
        </ul>
      </details>
      <p v-else-if="currentEffectiveFields.some(f => f.builtIn)" class="no-deleted">{{ t.config.noHiddenFields }}</p>
    </section>

    <!-- Edit/Add Template Modal -->
    <Modal v-if="editingTemplate !== null" :title="editingTemplateIsNew ? t.config.addTemplate : t.config.editTemplate" @close="closeTemplateModal">
      <form @submit.prevent="saveTemplate">
        <div class="form-group">
          <label for="tpl-name">{{ t.config.templateName }}</label>
          <input id="tpl-name" v-model="templateForm.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="tpl-group">{{ t.config.templateGroup }}</label>
          <select id="tpl-group" v-model="templateForm.group" class="form-control">
            <option v-for="(label, key) in t.config.groupLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tpl-desc">{{ t.config.templateDescription }}</label>
          <textarea id="tpl-desc" v-model="templateForm.description" class="form-control" rows="3" />
        </div>
        <div class="form-group form-group-row">
          <div class="form-group-half">
            <label for="tpl-sort">{{ t.config.templateSortOrder }}</label>
            <input id="tpl-sort" v-model.number="templateForm.sortOrder" type="number" class="form-control" />
          </div>
          <div class="form-group-half form-group-checkbox">
            <label class="checkbox-label">
              <input type="checkbox" v-model="templateForm.createOnNewProject" />
              {{ t.config.createOnNewProject }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t.config.checklist }}</label>
          <ul class="checklist-editor-list" role="list">
            <li v-for="(item, idx) in templateForm.checklist" :key="item.id" class="checklist-editor-item">
              <input
                :id="`ci-${item.id}`"
                v-model="item.label"
                class="form-control checklist-editor-input"
                :placeholder="t.config.checklistItemPlaceholder"
              />
              <button type="button" class="btn btn-ghost btn-sm" @click="removeChecklistItem(idx)" :aria-label="t.config.removeChecklistItem">
                ✕
              </button>
            </li>
          </ul>
          <div class="checklist-add-row">
            <input
              v-model="newChecklistLabel"
              class="form-control checklist-editor-input"
              :placeholder="t.config.checklistItemPlaceholder"
              @keydown.enter.prevent="addChecklistItem"
            />
            <button type="button" class="btn btn-secondary btn-sm" @click="addChecklistItem">
              {{ t.config.addChecklistItem }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeTemplateModal">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <!-- Edit Built-in Field Modal -->
    <Modal v-if="editingBuiltIn !== null" :title="t.config.editBuiltInField" @close="closeBuiltInModal">
      <form @submit.prevent="saveBuiltIn">
        <div class="form-group">
          <label for="bi-label">{{ t.config.fieldLabel }}</label>
          <input id="bi-label" v-model="builtInForm.label" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="bi-type">{{ t.config.fieldType }}</label>
          <input id="bi-type" :value="fieldTypeLabel(editingBuiltIn?.type)" class="form-control" disabled />
        </div>
        <div class="form-group">
          <label for="bi-sort">{{ t.config.fieldSortOrder }}</label>
          <input id="bi-sort" v-model.number="builtInForm.sortOrder" type="number" class="form-control" />
        </div>

        <!-- Select options editor -->
        <div v-if="editingBuiltIn?.type === 'select'" class="form-group">
          <label>{{ t.config.selectOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(opt, idx) in builtInForm.options" :key="idx" class="options-editor-item">
              <input
                v-model="opt.value"
                class="form-control options-value-input"
                :placeholder="t.config.optionValue"
              />
              <input
                v-model="opt.label"
                class="form-control options-label-input"
                :placeholder="t.config.optionLabel"
              />
              <button type="button" class="btn btn-ghost btn-sm" @click="builtInForm.options.splice(idx, 1)" :aria-label="t.config.removeOption">
                ✕
              </button>
            </li>
          </ul>
          <button type="button" class="btn btn-secondary btn-sm" @click="builtInForm.options.push({ value: '', label: '' })">
            {{ t.config.addOption }}
          </button>
        </div>

        <!-- Number-unit units editor -->
        <div v-if="editingBuiltIn?.type === 'number-unit'" class="form-group">
          <label>{{ t.config.unitOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(u, idx) in builtInForm.units" :key="idx" class="options-editor-item">
              <input
                v-model="u.value"
                class="form-control options-value-input"
                :placeholder="t.config.unitValue"
              />
              <input
                v-model="u.label"
                class="form-control options-label-input"
                :placeholder="t.config.unitLabel"
              />
              <button type="button" class="btn btn-ghost btn-sm" @click="builtInForm.units.splice(idx, 1)" :aria-label="t.config.removeUnit">
                ✕
              </button>
            </li>
          </ul>
          <button type="button" class="btn btn-secondary btn-sm" @click="builtInForm.units.push({ value: '', label: '' })">
            {{ t.config.addUnit }}
          </button>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeBuiltInModal">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <!-- Edit/Add Custom Field Modal -->
    <Modal v-if="editingField !== null" :title="editingFieldIsNew ? t.config.addField : t.config.editField" @close="closeFieldModal">
      <form @submit.prevent="saveField">
        <div class="form-group">
          <label for="field-label">{{ t.config.fieldLabel }}</label>
          <input id="field-label" v-model="fieldForm.label" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="field-type">{{ t.config.fieldType }}</label>
          <select id="field-type" v-model="fieldForm.type" class="form-control">
            <option value="text">{{ t.config.fieldTypeText }}</option>
            <option value="textarea">{{ t.config.fieldTypeTextarea }}</option>
            <option value="url">{{ t.config.fieldTypeUrl }}</option>
            <option value="select">{{ t.config.fieldTypeSelect }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="field-sort">{{ t.config.fieldSortOrder }}</label>
          <input id="field-sort" v-model.number="fieldForm.sortOrder" type="number" class="form-control" />
        </div>

        <!-- Select options editor for custom fields -->
        <div v-if="fieldForm.type === 'select'" class="form-group">
          <label>{{ t.config.selectOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(opt, idx) in fieldForm.options" :key="idx" class="options-editor-item">
              <input
                v-model="opt.value"
                class="form-control options-value-input"
                :placeholder="t.config.optionValue"
              />
              <input
                v-model="opt.label"
                class="form-control options-label-input"
                :placeholder="t.config.optionLabel"
              />
              <button type="button" class="btn btn-ghost btn-sm" @click="fieldForm.options.splice(idx, 1)" :aria-label="t.config.removeOption">
                ✕
              </button>
            </li>
          </ul>
          <button type="button" class="btn btn-secondary btn-sm" @click="fieldForm.options.push({ value: '', label: '' })">
            {{ t.config.addOption }}
          </button>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeFieldModal">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <!-- Confirm delete template -->
    <ConfirmDialog
      v-if="confirmingDeleteTemplate"
      :title="t.config.deleteTemplate"
      :message="t.config.templateDeleteConfirm"
      @confirm="doDeleteTemplate"
      @cancel="confirmingDeleteTemplate = null"
    />

    <!-- Confirm delete field -->
    <ConfirmDialog
      v-if="confirmingDeleteField"
      :title="t.config.deleteField"
      :message="t.config.fieldDeleteConfirm"
      @confirm="doDeleteField"
      @cancel="confirmingDeleteField = null"
    />

    <!-- Confirm reset built-in -->
    <ConfirmDialog
      v-if="confirmingResetBuiltIn"
      :title="t.config.resetField"
      :message="t.config.resetFieldConfirm"
      @confirm="doResetBuiltIn"
      @cancel="confirmingResetBuiltIn = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import { generateId } from '../lib/id.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const config = useConfig()
const { t, tPath } = useI18n()

// ─── Templates ───────────────────────────────────────────────

const activeTemplates = computed(() => config.getEffectiveTemplates())
const deletedTemplates = computed(() => config.getDeletedBuiltInTemplates())

function toggleCreateOnNewProject(tpl) {
  config.updateTemplate(tpl.key, { createOnNewProject: !tpl.createOnNewProject })
}

const editingTemplate = ref(null)
const editingTemplateIsNew = ref(false)
const templateForm = reactive({
  key: '',
  name: '',
  group: 'project',
  description: '',
  sortOrder: 9999,
  createOnNewProject: false,
  checklist: [],
})
const newChecklistLabel = ref('')

function openAddTemplate() {
  editingTemplateIsNew.value = true
  editingTemplate.value = {}
  templateForm.key = ''
  templateForm.name = ''
  templateForm.group = 'project'
  templateForm.description = ''
  templateForm.sortOrder = 9999
  templateForm.createOnNewProject = false
  templateForm.checklist = []
  newChecklistLabel.value = ''
}

function openEditTemplate(tpl) {
  editingTemplateIsNew.value = false
  editingTemplate.value = tpl
  templateForm.key = tpl.key
  templateForm.name = tpl.name
  templateForm.group = tpl.group
  templateForm.description = tpl.description || ''
  templateForm.sortOrder = tpl.sortOrder ?? 9999
  templateForm.createOnNewProject = tpl.createOnNewProject ?? true
  templateForm.checklist = (tpl.checklist || []).map((ci) => ({ ...ci }))
  newChecklistLabel.value = ''
}

function closeTemplateModal() {
  editingTemplate.value = null
}

function addChecklistItem() {
  const label = newChecklistLabel.value.trim()
  if (!label) return
  templateForm.checklist.push({ id: generateId(), label })
  newChecklistLabel.value = ''
}

function removeChecklistItem(idx) {
  templateForm.checklist.splice(idx, 1)
}

function saveTemplate() {
  const updates = {
    name: templateForm.name,
    group: templateForm.group,
    description: templateForm.description,
    sortOrder: templateForm.sortOrder,
    createOnNewProject: templateForm.createOnNewProject,
    checklist: templateForm.checklist.map((ci) => ({ id: ci.id, label: ci.label })),
  }
  if (editingTemplateIsNew.value) {
    config.addCustomTemplate(updates)
  } else {
    config.updateTemplate(templateForm.key, updates)
  }
  closeTemplateModal()
}

const confirmingDeleteTemplate = ref(null)

function confirmDeleteTemplate(tpl) {
  confirmingDeleteTemplate.value = tpl
}

function doDeleteTemplate() {
  if (confirmingDeleteTemplate.value) {
    config.deleteTemplate(confirmingDeleteTemplate.value.key)
  }
  confirmingDeleteTemplate.value = null
}

// ─── Entity Fields ───────────────────────────────────────────

const selectedEntityType = ref('goal')

/** Efektivní atributy (vestavěné + vlastní) pro vybraný typ entity. */
const currentEffectiveFields = computed(() =>
  config.getEffectiveEntityFields(selectedEntityType.value, tPath)
)

/** Skryté vestavěné atributy pro vybraný typ entity. */
const currentHiddenFields = computed(() =>
  config.getHiddenBuiltInFields(selectedEntityType.value, tPath)
)

/**
 * Vrátí lokalizovaný popisek typu atributu.
 * @param {string} type
 * @returns {string}
 */
function fieldTypeLabel(type) {
  const map = {
    text: t.config.fieldTypeText,
    textarea: t.config.fieldTypeTextarea,
    url: t.config.fieldTypeUrl,
    select: t.config.fieldTypeSelect,
    'number-unit': t.config.fieldTypeNumberUnit,
    email: t.config.fieldTypeEmail,
    tel: t.config.fieldTypeTel,
  }
  return map[type] || type
}

/**
 * Zjistí, zda má vestavěný atribut přepis.
 * @param {string} fieldKey
 * @returns {boolean}
 */
function isOverridden(fieldKey) {
  return config.isFieldOverridden(selectedEntityType.value, fieldKey)
}

// --- Built-in field editing ---

const editingBuiltIn = ref(null)
const builtInForm = reactive({
  label: '',
  sortOrder: 0,
  options: [],
  units: [],
})

/**
 * Otevře modál pro editaci vestavěného atributu.
 * @param {Object} field
 */
function openEditBuiltIn(field) {
  editingBuiltIn.value = field
  builtInForm.label = field.label
  builtInForm.sortOrder = field.sortOrder ?? 0
  builtInForm.options = field.options ? field.options.map((o) => ({ ...o })) : []
  builtInForm.units = field.units ? field.units.map((u) => ({ ...u })) : []
}

function closeBuiltInModal() {
  editingBuiltIn.value = null
}

/**
 * Uloží změny vestavěného atributu jako přepis.
 */
function saveBuiltIn() {
  if (!editingBuiltIn.value) return
  const updates = {
    label: builtInForm.label,
    sortOrder: builtInForm.sortOrder,
  }
  if (editingBuiltIn.value.type === 'select' && builtInForm.options.length > 0) {
    updates.options = builtInForm.options
      .filter((o) => o.value !== '' || o.label !== '')
      .map((o) => ({ value: o.value, label: o.label }))
  }
  if (editingBuiltIn.value.type === 'number-unit' && builtInForm.units.length > 0) {
    updates.units = builtInForm.units
      .filter((u) => u.value !== '' || u.label !== '')
      .map((u) => ({ value: u.value, label: u.label }))
  }
  config.updateFieldOverride(selectedEntityType.value, editingBuiltIn.value.key, updates)
  closeBuiltInModal()
}

/**
 * Skryje vestavěný atribut.
 * @param {string} fieldKey
 */
function hideBuiltInField(fieldKey) {
  config.updateFieldOverride(selectedEntityType.value, fieldKey, { hidden: true })
}

/**
 * Zobrazí skrytý vestavěný atribut.
 * @param {string} fieldKey
 */
function showBuiltInField(fieldKey) {
  config.updateFieldOverride(selectedEntityType.value, fieldKey, { hidden: false })
}

const confirmingResetBuiltIn = ref(null)

function confirmResetBuiltIn(field) {
  confirmingResetBuiltIn.value = field
}

function doResetBuiltIn() {
  if (confirmingResetBuiltIn.value) {
    config.resetFieldOverride(selectedEntityType.value, confirmingResetBuiltIn.value.key)
  }
  confirmingResetBuiltIn.value = null
}

// --- Custom field editing ---

const editingField = ref(null)
const editingFieldIsNew = ref(false)
const fieldForm = reactive({
  id: '',
  label: '',
  type: 'text',
  sortOrder: 0,
  options: [],
})

function openAddField() {
  editingFieldIsNew.value = true
  editingField.value = {}
  fieldForm.id = ''
  fieldForm.label = ''
  fieldForm.type = 'text'
  fieldForm.sortOrder = (currentEffectiveFields.value.length) * 10
  fieldForm.options = []
}

/**
 * Otevře modál pro editaci vlastního atributu.
 * @param {Object} field
 */
function openEditField(field) {
  editingFieldIsNew.value = false
  editingField.value = field
  fieldForm.id = field.id
  fieldForm.label = field.label
  fieldForm.type = field.type || 'text'
  fieldForm.sortOrder = field.sortOrder ?? 0
  fieldForm.options = field.options ? field.options.map((o) => ({ ...o })) : []
}

function closeFieldModal() {
  editingField.value = null
}

/**
 * Uloží vlastní atribut (nový nebo aktualizovaný).
 */
function saveField() {
  const data = {
    label: fieldForm.label,
    type: fieldForm.type,
    sortOrder: fieldForm.sortOrder,
  }
  if (fieldForm.type === 'select') {
    data.options = fieldForm.options
      .filter((o) => o.value !== '' || o.label !== '')
      .map((o) => ({ value: o.value, label: o.label }))
  } else {
    data.options = undefined
  }
  if (editingFieldIsNew.value) {
    config.addEntityField(selectedEntityType.value, data)
  } else {
    config.updateEntityField(selectedEntityType.value, fieldForm.id, data)
  }
  closeFieldModal()
}

const confirmingDeleteField = ref(null)

function confirmDeleteField(field) {
  confirmingDeleteField.value = field
}

function doDeleteField() {
  if (confirmingDeleteField.value) {
    config.deleteEntityField(selectedEntityType.value, confirmingDeleteField.value.id)
  }
  confirmingDeleteField.value = null
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }

.config-section {
  margin-bottom: var(--space-xl, 2.5rem);
  padding: var(--space-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.table-wrapper {
  overflow-x: auto;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.config-table th {
  text-align: left;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border);
}

.config-table td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.config-table tr:last-child td {
  border-bottom: none;
}

.config-table tbody tr:hover td {
  background: var(--bg-muted, rgba(0,0,0,0.03));
}

.row-overridden td:first-child {
  border-left: 3px solid var(--accent, #3b82f6);
  padding-left: calc(var(--space-sm) - 3px);
}

.row-actions {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
  white-space: nowrap;
  flex-wrap: wrap;
}

.empty-row {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--space-md) !important;
}

.group-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15em 0.55em;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: var(--text-muted);
}

.group-badge.group-project { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.group-badge.group-research { background: #fef9c3; color: #854d0e; border-color: #fef08a; }
.group-badge.group-design { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }

@media (prefers-color-scheme: dark) {
  .group-badge.group-project { background: #0c4a6e; color: #bae6fd; border-color: #0369a1; }
  .group-badge.group-research { background: #451a03; color: #fef08a; border-color: #854d0e; }
  .group-badge.group-design { background: #3b0764; color: #e9d5ff; border-color: #6b21a8; }
}

.type-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.15em 0.55em;
  border-radius: 4px;
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.source-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 0.12em 0.5em;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.source-builtin {
  background: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}

.source-custom {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

@media (prefers-color-scheme: dark) {
  .source-builtin { background: #1e3a5f; color: #93c5fd; border-color: #1e40af; }
  .source-custom { background: #14532d; color: #86efac; border-color: #166534; }
}

.modified-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 500;
  padding: 0.1em 0.4em;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  margin-left: var(--space-xs);
  vertical-align: middle;
}

@media (prefers-color-scheme: dark) {
  .modified-badge { background: #451a03; color: #fde68a; border-color: #92400e; }
}

.danger-btn { color: var(--color-danger, #dc2626); }
.danger-btn:hover { background: rgba(220, 38, 38, 0.08); }

.deleted-section {
  margin-top: var(--space-md);
  border-top: 1px solid var(--border);
  padding-top: var(--space-md);
}

.deleted-summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
  padding: var(--space-xs) 0;
  user-select: none;
}

.deleted-list {
  list-style: none;
  margin: var(--space-sm) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.deleted-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border);
}

.deleted-item:last-child { border-bottom: none; }

.deleted-name {
  flex: 1;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.no-deleted {
  margin: var(--space-md) 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.entity-type-select-group {
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.entity-type-select-group label {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.entity-type-select {
  max-width: 220px;
}

.form-group { margin-bottom: var(--space-md); }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }

.form-group-row {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.form-group-half {
  flex: 1;
  min-width: 140px;
}

.form-group-checkbox {
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.2rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: normal !important;
  font-size: 0.92rem;
  cursor: pointer;
}

.checklist-editor-list {
  list-style: none;
  margin: 0 0 var(--space-sm);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.checklist-editor-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.checklist-editor-input {
  flex: 1;
}

.checklist-add-row {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.options-editor-list {
  list-style: none;
  margin: 0 0 var(--space-sm);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.options-editor-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.options-value-input {
  flex: 1;
  max-width: 10rem;
}

.options-label-input {
  flex: 2;
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}

.btn-sm { font-size: 0.8rem; padding: 0.2rem 0.6rem; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
</style>
