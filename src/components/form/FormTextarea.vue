<template>
  <div v-if="label || hint" class="form-group">
    <label v-if="label" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <div class="form-textarea" :class="{ 'form-textarea--dictation': showDictation }">
      <textarea
        ref="textareaRef"
        :id="controlId"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :rows="rows"
        :disabled="disabled"
        :readonly="readonly || dictation.active.value"
        class="form-control"
        v-bind="$attrs"
        @input="$emit('update:modelValue', ($event.target).value)"
      />
      <DictationButton v-if="showDictation" class="form-textarea__mic" :dictation="dictation" />
    </div>
    <DictationStatus v-if="showDictation" :dictation="dictation" />
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
  <div v-else class="form-textarea" :class="{ 'form-textarea--dictation': showDictation }">
    <textarea
      ref="textareaRef"
      :id="controlId"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :rows="rows"
      :disabled="disabled"
      :readonly="readonly || dictation.active.value"
      class="form-control"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target).value)"
    />
    <DictationButton v-if="showDictation" class="form-textarea__mic" :dictation="dictation" />
    <DictationStatus v-if="showDictation" :dictation="dictation" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDictation } from '../../composables/useDictation.js'
import DictationButton from '../DictationButton.vue'
import DictationStatus from '../DictationStatus.vue'

/**
 * FormTextarea – vícedřádkové textové pole se sjednoceným stylingem.
 * Volitelně zobrazí label a hint přímo v komponentě.
 * S aktivním konektorem Recognita má v rohu tlačítko diktování (vypne ho prop `dictation: false`).
 * @prop {string} label - text popisku
 * @prop {string} hint - nápovědný text pod polem
 * @prop {string} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci s label
 * @prop {string} placeholder - placeholder text
 * @prop {boolean} required - povinné pole
 * @prop {number} rows - počet řádků
 * @prop {boolean} disabled - zakázané
 * @prop {boolean} readonly - jen pro čtení
 * @prop {boolean} dictation - nabídnout diktování (výchozí true)
 */
const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  controlId: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  dictation: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const textareaRef = ref(null)

const dictation = useDictation({
  getValue: () => props.modelValue || '',
  setValue: (text) => emit('update:modelValue', text),
  getElement: () => textareaRef.value,
})

const showDictation = computed(() => props.dictation && !props.disabled && !props.readonly
  && (dictation.available.value || dictation.active.value || !!dictation.message.value))

defineExpose({
  /** Předá focus na textarea element */
  focus: () => textareaRef.value?.focus(),
})
</script>

<script>
export default {
  name: 'FormTextarea',
  inheritAttrs: false,
}
</script>

<style scoped>
.form-textarea {
  position: relative;
  width: 100%;
}

.form-textarea__mic {
  position: absolute;
  top: 6px;
  right: 6px;
}

.form-control {
  width: 100%;
  min-height: 80px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color var(--transition);
}

.form-textarea--dictation .form-control {
  padding-right: calc(var(--space-sm) + 34px);
}

.form-control:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-muted);
}

.form-control::placeholder {
  color: var(--text-muted);
}
</style>
