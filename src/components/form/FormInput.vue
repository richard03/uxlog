<template>
  <div v-if="label || hint" class="form-group">
    <label v-if="label" :for="controlId || undefined" class="form-group-label">{{ label }}</label>
    <div v-if="showDictation" class="form-input form-input--dictation">
      <input
        ref="inputRef"
        :id="controlId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :max="max"
        :minlength="minlength"
        :maxlength="maxlength"
        :disabled="disabled"
        :readonly="readonly || dictation.active.value"
        :autocomplete="autocomplete"
        class="form-control"
        v-bind="$attrs"
        @input="$emit('update:modelValue', ($event.target).value)"
      />
      <DictationButton class="form-input__mic" :dictation="dictation" />
    </div>
    <input v-else
      ref="inputRef"
      :id="controlId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :min="min"
      :max="max"
      :minlength="minlength"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly || dictation.active.value"
      :autocomplete="autocomplete"
      class="form-control"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target).value)"
    />
    <DictationStatus v-if="showDictation" :dictation="dictation" />
    <p v-if="hint" class="form-group-hint">{{ hint }}</p>
  </div>
  <div v-else-if="showDictation" class="form-input form-input--dictation">
    <input
      ref="inputRef"
      :id="controlId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :min="min"
      :max="max"
      :minlength="minlength"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly || dictation.active.value"
      :autocomplete="autocomplete"
      class="form-control"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target).value)"
    />
    <DictationButton class="form-input__mic" :dictation="dictation" />
    <DictationStatus :dictation="dictation" />
  </div>
  <input
    v-else
    ref="inputRef"
    :id="controlId"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :min="min"
    :max="max"
    :minlength="minlength"
    :maxlength="maxlength"
    :disabled="disabled"
    :readonly="readonly || dictation.active.value"
    :autocomplete="autocomplete"
    class="form-control"
    v-bind="$attrs"
    @input="$emit('update:modelValue', ($event.target).value)"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDictation } from '../../composables/useDictation.js'
import DictationButton from '../DictationButton.vue'
import DictationStatus from '../DictationStatus.vue'
/**
 * FormInput – textové vstupní pole se sjednoceným stylingem.
 * Volitelně zobrazí label a hint přímo v komponentě.
 * @prop {string} label - text popisku (pokud je, zobrazí se celá form-group)
 * @prop {string} hint - nápovědný text pod polem
 * @prop {string} modelValue - v-model hodnota
 * @prop {string} controlId - ID pro asociaci s label
 * @prop {string} type - typ inputu: text, email, tel, url, number, date, search...
 * @prop {string} placeholder - placeholder text
 * @prop {boolean} required - povinné pole
 * @prop {number|string} min - minimální hodnota (number, date)
 * @prop {number|string} max - maximální hodnota
 * @prop {number} minlength - minimální délka
 * @prop {number} maxlength - maximální délka
 * @prop {boolean} disabled - zakázané
 * @prop {string} autocomplete - hodnota autocomplete
 * @prop {boolean} readonly - jen pro čtení
 * @prop {boolean} dictation - nabídnout diktování (výchozí true; jen u type="text", s aktivním konektorem Recognita)
 */
const props = defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  controlId: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  minlength: { type: Number, default: undefined },
  maxlength: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
  readonly: { type: Boolean, default: false },
  dictation: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)

/** Diktování hlasem – text se vkládá na místo kurzoru (jen textová pole, ne e-mail, URL, čísla…). */
const dictation = useDictation({
  getValue: () => (props.modelValue == null ? '' : String(props.modelValue)),
  setValue: (text) => emit('update:modelValue', text),
  getElement: () => inputRef.value,
})

const showDictation = computed(() => props.dictation && props.type === 'text' && !props.disabled && !props.readonly
  && (dictation.available.value || dictation.active.value || !!dictation.message.value))
defineExpose({
  /** Předá focus na vnitřní input element */
  focus: () => inputRef.value?.focus(),
  /** Otevře nativní picker (datum, čas) pokud ho prohlížeč podporuje */
  showPicker: () => inputRef.value?.showPicker?.(),
})
</script>

<script>
export default {
  name: 'FormInput',
  inheritAttrs: false,
}
</script>

<style scoped>
.form-input {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-width: 0;
}

.form-input__mic {
  position: absolute;
  top: 50%;
  right: 5px;
  transform: translateY(-50%);
}

/* Stavový řádek diktování pod polem – tlačítko zůstane svisle uprostřed pole */
.form-input:has(.dictation-status__msg) .form-input__mic {
  top: 5px;
  transform: none;
}

.form-input--dictation .form-control {
  padding-right: calc(var(--space-sm) + 32px);
}

.form-control {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color var(--transition);
}

.form-control:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-muted);
}

/* Checkbox a radio – nemají width 100 % */
.form-control[type="checkbox"],
.form-control[type="radio"] {
  width: auto;
  padding: 0;
}

.form-control::placeholder {
  color: var(--text-muted);
}
</style>
