<template>
  <section v-if="customFields.length > 0" class="detail-section custom-fields-section" :aria-label="t.config.customFieldsSectionTitle">
    <h2 class="custom-fields-title">{{ t.config.customFieldsSectionTitle }}</h2>
    <dl class="detail-list">
      <div
        v-for="field in customFields"
        :key="field.id"
        class="detail-item"
        @click="openEdit(field)"
      >
        <dt>{{ field.label }}</dt>
        <dd :class="{ 'value-empty': !fieldValue(field.id) }">{{ displayValue(field) }}</dd>
        <svg class="pencil edit-btn" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </div>
    </dl>

    <Modal v-if="editingField" :title="editingField.label" @close="closeEdit">
      <form @submit.prevent="saveEdit">
        <FormTextarea
          v-if="editingField.type === 'textarea'"
          v-model="editValue"
          :label="editingField.label"
          control-id="custom-field-edit"
          :rows="4"
        />
        <FormSelect
          v-else-if="editingField.type === 'select'"
          v-model="editValue"
          :label="editingField.label"
          control-id="custom-field-edit"
          :options="(editingField.options || []).map((o) => ({ value: o.value, label: o.label }))"
        />
        <FormInput v-else v-model="editValue" :label="editingField.label" control-id="custom-field-edit" />
        <FormActions>
          <AppButton variant="secondary" @click="closeEdit">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from './Modal.vue'
import { FormInput, FormTextarea, FormSelect, FormActions } from './form'
import AppButton from './AppButton.vue'

const props = defineProps({
  entityType: {
    type: String,
    required: true,
  },
  entity: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update'])

const { getEntityCustomFields } = useConfig()
const { t } = useI18n()

const customFields = computed(() => getEntityCustomFields(props.entityType))

function fieldValue(fieldId) {
  return props.entity?.customFields?.[fieldId] ?? ''
}

/**
 * Vrátí hodnotu pole pro zobrazení. U select polí vrátí popisek.
 * @param {Object} field
 * @returns {string}
 */
function displayValue(field) {
  const val = fieldValue(field.id)
  if (!val) return '—'
  if (field.type === 'select' && field.options) {
    return field.options.find((o) => o.value === val)?.label ?? val
  }
  return val
}

const editingField = ref(null)
const editValue = ref('')

function openEdit(field) {
  editingField.value = field
  editValue.value = fieldValue(field.id)
}

function closeEdit() {
  editingField.value = null
  editValue.value = ''
}

function saveEdit() {
  if (!editingField.value) return
  const merged = {
    ...(props.entity?.customFields || {}),
    [editingField.value.id]: editValue.value,
  }
  emit('update', { customFields: merged })
  closeEdit()
}
</script>

<style scoped>
.custom-fields-section { margin-top: var(--space-lg); }
.custom-fields-title { margin: 0 0 var(--space-sm); font-size: 1rem; font-weight: 600; }
.detail-list { margin: 0; padding: 0; }
.detail-item { display: grid; grid-template-columns: 10rem 1fr auto; align-items: baseline; gap: 0 var(--space-sm); border-bottom: 1px solid var(--border); padding: var(--space-xs) 0; cursor: pointer; }
.detail-item:last-child { border-bottom: none; }
.detail-item dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
.detail-item dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }
.value-empty { color: var(--text-muted); font-style: italic; }
.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn, .detail-item:focus-within .edit-btn { opacity: 1; }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
@media (max-width: 600px) {
  .detail-item { grid-template-columns: 1fr auto; }
  .detail-item dt { grid-column: 1 / -1; margin-bottom: 2px; }
  .detail-item dd { grid-column: 1; }
}
</style>
