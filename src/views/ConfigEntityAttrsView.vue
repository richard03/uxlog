<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="section-header">
        <h1>{{ t.config.entityFields }}: {{ entityLabel }}</h1>
        <AppButton variant="primary" size="sm" @click="openAddField">
          {{ t.config.addField }}
        </AppButton>
      </div>
    </header>

    <section class="config-section" aria-labelledby="fields-heading">
      <h2 id="fields-heading" class="visually-hidden">{{ t.config.entityFields }}</h2>

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
                <AppButton variant="tertiary" size="sm" @click="field.builtIn ? openEditBuiltIn(field) : openEditField(field)">
                  {{ t.config.editField }}
                </AppButton>
                <AppButton v-if="field.builtIn" variant="dangerTertiary" size="sm" @click="hideBuiltInField(field.key)">
                  {{ t.config.hideField }}
                </AppButton>
                <AppButton v-if="field.builtIn && isOverridden(field.key)" variant="tertiary" size="sm" @click="confirmResetBuiltIn(field)">
                  {{ t.config.resetField }}
                </AppButton>
                <AppButton v-if="field.isCustom" variant="dangerTertiary" size="sm" @click="confirmDeleteField(field)">
                  {{ t.config.deleteField }}
                </AppButton>
              </td>
            </tr>
            <tr v-if="currentEffectiveFields.length === 0">
              <td colspan="5" class="empty-row">{{ t.config.noFields }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <details class="deleted-section" v-if="currentHiddenFields.length > 0">
        <summary class="deleted-summary">{{ t.config.hiddenFields }} ({{ currentHiddenFields.length }})</summary>
        <ul class="deleted-list" role="list">
          <li v-for="field in currentHiddenFields" :key="field.key" class="deleted-item">
            <span class="deleted-name">{{ field.label }}</span>
            <span class="type-badge">{{ fieldTypeLabel(field.type) }}</span>
            <AppButton variant="secondary" size="sm" @click="showBuiltInField(field.key)">
              {{ t.config.showField }}
            </AppButton>
          </li>
        </ul>
      </details>
      <p v-else-if="currentEffectiveFields.some(f => f.builtIn)" class="no-deleted">{{ t.config.noHiddenFields }}</p>
    </section>

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

        <div v-if="editingBuiltIn?.type === 'select'" class="form-group">
          <label>{{ t.config.selectOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(opt, idx) in builtInForm.options" :key="idx" class="options-editor-item">
              <input v-model="opt.value" class="form-control options-value-input" :placeholder="t.config.optionValue" />
              <input v-model="opt.label" class="form-control options-label-input" :placeholder="t.config.optionLabel" />
              <AppButton variant="tertiary" size="sm" :aria-label="t.config.removeOption" @click="builtInForm.options.splice(idx, 1)">✕</AppButton>
            </li>
          </ul>
          <AppButton variant="secondary" size="sm" @click="builtInForm.options.push({ value: '', label: '' })">
            {{ t.config.addOption }}
          </AppButton>
        </div>

        <div v-if="editingBuiltIn?.type === 'number-unit'" class="form-group">
          <label>{{ t.config.unitOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(u, idx) in builtInForm.units" :key="idx" class="options-editor-item">
              <input v-model="u.value" class="form-control options-value-input" :placeholder="t.config.unitValue" />
              <input v-model="u.label" class="form-control options-label-input" :placeholder="t.config.unitLabel" />
              <AppButton variant="tertiary" size="sm" :aria-label="t.config.removeUnit" @click="builtInForm.units.splice(idx, 1)">✕</AppButton>
            </li>
          </ul>
          <AppButton variant="secondary" size="sm" @click="builtInForm.units.push({ value: '', label: '' })">
            {{ t.config.addUnit }}
          </AppButton>
        </div>

        <FormActions>
          <AppButton variant="secondary" @click="closeBuiltInModal">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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

        <div v-if="fieldForm.type === 'select'" class="form-group">
          <label>{{ t.config.selectOptions }}</label>
          <ul class="options-editor-list" role="list">
            <li v-for="(opt, idx) in fieldForm.options" :key="idx" class="options-editor-item">
              <input v-model="opt.value" class="form-control options-value-input" :placeholder="t.config.optionValue" />
              <input v-model="opt.label" class="form-control options-label-input" :placeholder="t.config.optionLabel" />
              <AppButton variant="tertiary" size="sm" :aria-label="t.config.removeOption" @click="fieldForm.options.splice(idx, 1)">✕</AppButton>
            </li>
          </ul>
          <AppButton variant="secondary" size="sm" @click="fieldForm.options.push({ value: '', label: '' })">
            {{ t.config.addOption }}
          </AppButton>
        </div>

        <FormActions>
          <AppButton variant="secondary" @click="closeFieldModal">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="confirmingDeleteField"
      :title="t.config.deleteField"
      :message="t.config.fieldDeleteConfirm"
      @confirm="doDeleteField"
      @cancel="confirmingDeleteField = null"
    />

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
/**
 * Editace atributů pro vybraný typ entity.
 */
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import AppButton from '../components/AppButton.vue'
import { FormActions } from '../components/form'

const route = useRoute()
const router = useRouter()
const config = useConfig()
const { t, tPath } = useI18n()

const entityType = computed(() => route.params.entityType)

watch(entityType, (type) => {
  if (type && !config.ENTITY_FIELD_DEFAULTS[type]) {
    router.replace({ name: 'configEntities' })
  }
}, { immediate: true })

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.entities, to: { name: 'configEntities' } },
  { label: entityLabel.value },
])

/** Lokalizovaný název typu entity. */
const entityLabel = computed(() => t.config.entityTypes[entityType.value] || entityType.value)

/** Efektivní atributy (vestavěné + vlastní) pro vybraný typ entity. */
const currentEffectiveFields = computed(() =>
  config.getEffectiveEntityFields(entityType.value, tPath)
)

/** Skryté vestavěné atributy pro vybraný typ entity. */
const currentHiddenFields = computed(() =>
  config.getHiddenBuiltInFields(entityType.value, tPath)
)

/**
 * Vrátí lokalizovaný popisek typu atributu.
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

function isOverridden(fieldKey) {
  return config.isFieldOverridden(entityType.value, fieldKey)
}

// --- Built-in field editing ---

const editingBuiltIn = ref(null)
const builtInForm = reactive({ label: '', sortOrder: 0, options: [], units: [] })

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

function saveBuiltIn() {
  if (!editingBuiltIn.value) return
  const updates = { label: builtInForm.label, sortOrder: builtInForm.sortOrder }
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
  config.updateFieldOverride(entityType.value, editingBuiltIn.value.key, updates)
  closeBuiltInModal()
}

function hideBuiltInField(fieldKey) {
  config.updateFieldOverride(entityType.value, fieldKey, { hidden: true })
}

function showBuiltInField(fieldKey) {
  config.updateFieldOverride(entityType.value, fieldKey, { hidden: false })
}

const confirmingResetBuiltIn = ref(null)

function confirmResetBuiltIn(field) {
  confirmingResetBuiltIn.value = field
}

function doResetBuiltIn() {
  if (confirmingResetBuiltIn.value) {
    config.resetFieldOverride(entityType.value, confirmingResetBuiltIn.value.key)
  }
  confirmingResetBuiltIn.value = null
}

// --- Custom field editing ---

const editingField = ref(null)
const editingFieldIsNew = ref(false)
const fieldForm = reactive({ id: '', label: '', type: 'text', sortOrder: 0, options: [] })

function openAddField() {
  editingFieldIsNew.value = true
  editingField.value = {}
  fieldForm.id = ''
  fieldForm.label = ''
  fieldForm.type = 'text'
  fieldForm.sortOrder = (currentEffectiveFields.value.length) * 10
  fieldForm.options = []
}

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

function saveField() {
  const data = { label: fieldForm.label, type: fieldForm.type, sortOrder: fieldForm.sortOrder }
  if (fieldForm.type === 'select') {
    data.options = fieldForm.options
      .filter((o) => o.value !== '' || o.label !== '')
      .map((o) => ({ value: o.value, label: o.label }))
  } else {
    data.options = undefined
  }
  if (editingFieldIsNew.value) {
    config.addEntityField(entityType.value, data)
  } else {
    config.updateEntityField(entityType.value, fieldForm.id, data)
  }
  closeFieldModal()
}

const confirmingDeleteField = ref(null)

function confirmDeleteField(field) {
  confirmingDeleteField.value = field
}

function doDeleteField() {
  if (confirmingDeleteField.value) {
    config.deleteEntityField(entityType.value, confirmingDeleteField.value.id)
  }
  confirmingDeleteField.value = null
}
</script>

<style scoped>
.section-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
.section-header h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
.table-wrapper { overflow-x: auto; }
.config-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.config-table th { text-align: left; font-weight: 600; font-size: 0.8rem; color: var(--text-muted); padding: var(--space-xs) var(--space-sm); border-bottom: 1px solid var(--border); }
.config-table td { padding: var(--space-xs) var(--space-sm); border-bottom: 1px solid var(--border); vertical-align: middle; }
.config-table tr:last-child td { border-bottom: none; }
.config-table tbody tr:hover td { background: var(--bg-muted, rgba(0,0,0,0.03)); }
.row-overridden td:first-child { border-left: 3px solid var(--accent, #3b82f6); padding-left: calc(var(--space-sm) - 3px); }
.row-actions { display: flex; gap: var(--space-xs); justify-content: flex-end; white-space: nowrap; flex-wrap: wrap; }
.empty-row { color: var(--text-muted); font-style: italic; text-align: center; padding: var(--space-md) !important; }
.type-badge { display: inline-block; font-size: 0.75rem; padding: 0.15em 0.55em; border-radius: 4px; background: var(--bg-muted); color: var(--text-muted); border: 1px solid var(--border); }
.source-badge { display: inline-block; font-size: 0.72rem; font-weight: 500; padding: 0.12em 0.5em; border-radius: 4px; border: 1px solid var(--border); }
.source-builtin { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
.source-custom { background: #dcfce7; color: #166534; border-color: #86efac; }
@media (prefers-color-scheme: dark) { .source-builtin { background: #1e3a5f; color: #93c5fd; } .source-custom { background: #14532d; color: #86efac; } }
.modified-badge { display: inline-block; font-size: 0.68rem; font-weight: 500; padding: 0.1em 0.4em; border-radius: 4px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; margin-left: var(--space-xs); vertical-align: middle; }
@media (prefers-color-scheme: dark) { .modified-badge { background: #451a03; color: #fde68a; border-color: #92400e; } }
.deleted-section { margin-top: var(--space-md); border-top: 1px solid var(--border); padding-top: var(--space-md); }
.deleted-summary { cursor: pointer; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; padding: var(--space-xs) 0; user-select: none; }
.deleted-list { list-style: none; margin: var(--space-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.deleted-item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) 0; border-bottom: 1px solid var(--border); }
.deleted-item:last-child { border-bottom: none; }
.deleted-name { flex: 1; font-size: 0.92rem; color: var(--text-muted); }
.no-deleted { margin: var(--space-md) 0 0; font-size: 0.85rem; color: var(--text-muted); font-style: italic; }
.form-group { margin-bottom: var(--space-md); }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }
.options-editor-list { list-style: none; margin: 0 0 var(--space-sm); padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.options-editor-item { display: flex; align-items: center; gap: var(--space-xs); }
.options-value-input { flex: 1; max-width: 10rem; }
.options-label-input { flex: 2; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
