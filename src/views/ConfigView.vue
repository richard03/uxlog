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

      <!-- Deleted built-in templates -->
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

    <!-- Section 2: Custom Entity Fields -->
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
              <th><span class="visually-hidden">{{ t.common.actions }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in currentEntityFields" :key="field.id">
              <td>{{ field.label }}</td>
              <td>
                <span class="type-badge">{{ field.type === 'textarea' ? t.config.fieldTypeTextarea : t.config.fieldTypeText }}</span>
              </td>
              <td>{{ field.sortOrder }}</td>
              <td class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="openEditField(field)">
                  {{ t.config.editField }}
                </button>
                <button type="button" class="btn btn-ghost btn-sm danger-btn" @click="confirmDeleteField(field)">
                  {{ t.config.deleteField }}
                </button>
              </td>
            </tr>
            <tr v-if="currentEntityFields.length === 0">
              <td colspan="4" class="empty-row">{{ t.config.noCustomFields }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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

        <!-- Checklist editor -->
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

    <!-- Edit/Add Field Modal -->
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
          </select>
        </div>
        <div class="form-group">
          <label for="field-sort">{{ t.config.fieldSortOrder }}</label>
          <input id="field-sort" v-model.number="fieldForm.sortOrder" type="number" class="form-control" />
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
const { t } = useI18n()

// --- Templates ---

const activeTemplates = computed(() => config.getEffectiveTemplates())
const deletedTemplates = computed(() => config.getDeletedBuiltInTemplates())

function toggleCreateOnNewProject(tpl) {
  config.updateTemplate(tpl.key, { createOnNewProject: !tpl.createOnNewProject })
}

// Template modal state
const editingTemplate = ref(null) // null = closed, object = editing
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

// --- Entity Fields ---

const selectedEntityType = ref('goal')

const currentEntityFields = computed(() => config.getEntityCustomFields(selectedEntityType.value))

const editingField = ref(null) // null = closed
const editingFieldIsNew = ref(false)
const fieldForm = reactive({
  id: '',
  label: '',
  type: 'text',
  sortOrder: 0,
})

function openAddField() {
  editingFieldIsNew.value = true
  editingField.value = {}
  fieldForm.id = ''
  fieldForm.label = ''
  fieldForm.type = 'text'
  fieldForm.sortOrder = (currentEntityFields.value.length) * 10
}

function openEditField(field) {
  editingFieldIsNew.value = false
  editingField.value = field
  fieldForm.id = field.id
  fieldForm.label = field.label
  fieldForm.type = field.type || 'text'
  fieldForm.sortOrder = field.sortOrder ?? 0
}

function closeFieldModal() {
  editingField.value = null
}

function saveField() {
  if (editingFieldIsNew.value) {
    config.addEntityField(selectedEntityType.value, {
      label: fieldForm.label,
      type: fieldForm.type,
      sortOrder: fieldForm.sortOrder,
    })
  } else {
    config.updateEntityField(selectedEntityType.value, fieldForm.id, {
      label: fieldForm.label,
      type: fieldForm.type,
      sortOrder: fieldForm.sortOrder,
    })
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

.row-actions {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
  white-space: nowrap;
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
