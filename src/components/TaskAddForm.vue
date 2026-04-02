<template>
  <form @submit.prevent="onSubmit">
    <FormInput
      v-model="form.code"
      :label="t.task.code"
      :control-id="`${controlIdPrefix}-code`"
    />
    <FormInput
      v-model="form.name"
      :label="t.task.name"
      :control-id="`${controlIdPrefix}-name`"
      required
    />
    <FormTextarea
      v-model="form.description"
      :label="t.task.description"
      :control-id="`${controlIdPrefix}-desc`"
    />
    <FormActions>
      <AppButton variant="secondary" type="button" @click="emit('cancel')">{{ t.common.cancel }}</AppButton>
      <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
    </FormActions>
  </form>
</template>

<script setup>
/**
 * Formulář přidání úkolu (kód, název, popis) – stejné pole jako v sekci Úkoly.
 * Objekt `form` vlastní rodič (reactive); komponenta ho mutuje přes v-model.
 */
import { useI18n } from '../composables/useI18n.js'
import { FormInput, FormTextarea, FormActions } from './form'
import AppButton from './AppButton.vue'

const props = defineProps({
  /** { code, name, description } */
  form: { type: Object, required: true },
  /** Prefix pro control-id (kvůli jedinečnosti ve více dialozích) */
  controlIdPrefix: { type: String, default: 'task-add' },
})

const emit = defineEmits(['submit', 'cancel'])

const { t } = useI18n()

/**
 * Odeslání pouze při neprázdném názvu.
 */
function onSubmit() {
  if (!String(props.form.name ?? '').trim()) return
  emit('submit')
}
</script>
