<template>
  <section v-if="customFields.length > 0" class="detail-section custom-fields-section" :aria-label="t.config.customFieldsSectionTitle">
    <h2 class="custom-fields-title">{{ t.config.customFieldsSectionTitle }}</h2>
    <dl class="detail-list">
      <InlineEditableDetailField
        v-for="field in customFields"
        :key="field.id"
        :label="field.label"
        :empty="!fieldValue(field.id)"
        :display-value="displayValue(field)"
        :raw-value="fieldValue(field.id)"
        :field="{ key: field.id, type: field.type || 'text', options: field.options || [] }"
        :cancel-text="t.common.cancel"
        :save-text="t.common.save"
        @save="(val) => saveCustomField(field.id, val)"
      />
    </dl>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import InlineEditableDetailField from './InlineEditableDetailField.vue'

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

/**
 * Uloží hodnotu vlastního pole a emituje aktualizaci.
 * @param {string} fieldId - ID vlastního pole
 * @param {string} value - nová hodnota
 */
function saveCustomField(fieldId, value) {
  const merged = {
    ...(props.entity?.customFields || {}),
    [fieldId]: value,
  }
  emit('update', { customFields: merged })
}
</script>

<style scoped>
.custom-fields-section { margin-top: var(--space-lg); }
.custom-fields-title { margin: 0 0 var(--space-sm); font-size: 1rem; font-weight: 600; }
.detail-list { margin: 0; padding: 0; }
</style>
