<template>
  <Modal v-if="modelValue" :title="t.task.add" @close="close">
    <TaskAddForm :form="form" @submit="submit" @cancel="close" />
  </Modal>
</template>

<script setup>
/**
 * Dialog „Přidat úkol“ – stejný jako v sekci Úkoly.
 * Volitelně lze předvyplnit pole (např. název z kroku checklistu).
 */
import { reactive, watch } from 'vue'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import Modal from './Modal.vue'
import TaskAddForm from './TaskAddForm.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: String, required: true },
  /**
   * Volitelné předvyplnění při otevření (code se ignoruje, pokud není uveden – vygeneruje se kód).
   * @type {{ code?: string, name?: string, description?: string }}
   */
  preset: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'save'])

const store = useStore()
const { t } = useI18n()
const { generateNextCode, getCodePrefix } = useEntityHelpers()

const form = reactive({ code: '', name: '', description: '' })

/**
 * Obnoví obsah formuláře při otevření modalu.
 */
function resetFormFromPreset() {
  const tasks = store.getTasks(props.projectId)
  const p = props.preset || {}
  const presetCode = p.code !== undefined && String(p.code).trim() !== '' ? String(p.code).trim() : ''
  form.code = presetCode || generateNextCode(getCodePrefix('task'), tasks)
  form.name = p.name ?? ''
  form.description = p.description ?? ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetFormFromPreset()
  }
)

function close() {
  emit('update:modelValue', false)
}

/**
 * Předá data rodiči (ten zavolá addTask nebo jinou persistenci).
 */
function submit() {
  emit('save', {
    code: String(form.code ?? '').trim(),
    name: String(form.name ?? '').trim(),
    description: String(form.description ?? '').trim(),
  })
  close()
}
</script>
