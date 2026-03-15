<template>
  <div
    class="detail-item"
    :class="{ 'detail-item-editing': isEditing, 'detail-item-select': isSelectField }"
    @click="!isEditing && !isSelectField && handleClick()"
  >
    <dt>{{ label }}</dt>

    <!-- Select pole: chip/popover picker přímo v řádku, bez editačního módu -->
    <dd v-if="isSelectField" class="select-picker-dd" @click.stop>
      <InlineSelectPicker
        :options="options"
        :model-value="String(rawValue ?? '')"
        :aria-label="label"
        @update:model-value="saveImmediate"
      />
    </dd>

    <!-- Standardní zobrazení pro ostatní typy -->
    <dd v-else-if="!isEditing" :class="[{ 'value-empty': empty }, valueClass]">
      <a
        v-if="showAsLink"
        :href="displayValue"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >{{ displayValue }}</a>
      <template v-else>{{ displayValue ?? '—' }}</template>
    </dd>

    <!-- Editační řádek pro textové typy -->
    <div v-else class="inline-edit-row">
      <FormInput
        v-if="fieldType === 'text' || fieldType === 'url' || fieldType === 'email' || fieldType === 'tel' || fieldType === 'date'"
        ref="inputRef"
        v-model="editValue"
        :type="fieldType === 'url' ? 'url' : fieldType === 'email' ? 'email' : fieldType === 'tel' ? 'tel' : fieldType === 'date' ? 'date' : 'text'"
        class="inline-edit-input"
        @keydown.enter.prevent="save"
        @keydown.escape="cancel"
      />
      <FormTextarea
        v-else-if="fieldType === 'textarea'"
        ref="inputRef"
        v-model="editValue"
        class="inline-edit-input"
        :rows="4"
        @keydown.escape="cancel"
      />
      <div class="inline-edit-actions" @click.stop>
        <AppButton variant="secondary" size="sm" @click="cancel">{{ cancelText }}</AppButton>
        <AppButton variant="primary" size="sm" @click="save">{{ saveText }}</AppButton>
      </div>
    </div>

    <!-- Tužka jen pro ne-select pole -->
    <svg
      v-if="!isEditing && !isSelectField"
      class="pencil edit-btn"
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import FormInput from './form/FormInput.vue'
import FormTextarea from './form/FormTextarea.vue'
import AppButton from './AppButton.vue'
import InlineSelectPicker from './InlineSelectPicker.vue'

/**
 * InlineEditableDetailField – detailové pole s inline editací pro jedno datové políčko.
 * U typů text, textarea, url, email, tel, select zobrazuje editor přímo v místě.
 * U number-unit emituje edit pro otevření modálu.
 *
 * @prop {string} label - popisek pole
 * @prop {string} displayValue - zobrazená hodnota (formátovaná)
 * @prop {string} rawValue - surová hodnota pro editaci
 * @prop {boolean} empty - zda je pole prázdné
 * @prop {Object} field - definice pole { key, type, options?, isCustom?, id? }
 * @prop {boolean} showAsLink - zda zobrazit jako odkaz (typ url)
 * @prop {string} cancelText - text tlačítka Zrušit
 * @prop {string} saveText - text tlačítka Uložit
 * @prop {boolean} useModal - true = vždy emitovat edit (modál), false = inline pokud možné
 */
const props = defineProps({
  label: { type: String, required: true },
  displayValue: { type: String, default: '' },
  rawValue: { type: [String, Number], default: '' },
  empty: { type: Boolean, default: false },
  field: { type: Object, required: true },
  showAsLink: { type: Boolean, default: false },
  cancelText: { type: String, default: '' },
  saveText: { type: String, default: '' },
  useModal: { type: Boolean, default: false },
  valueClass: { type: String, default: '' },
})

const emit = defineEmits(['edit', 'save'])

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref(null)

const fieldType = computed(() => props.field?.type ?? 'text')
const options = computed(() => props.field?.options ?? [])

/**
 * Zda pole umožňuje inline editaci (jedno datové políčko).
 */
const canEditInline = computed(() => !props.useModal && props.field && props.field.type !== 'number-unit')

/**
 * Zda jde o select pole s inline pickerem (bez editačního módu).
 */
const isSelectField = computed(() => fieldType.value === 'select' && !props.useModal)

function handleClick() {
  if (canEditInline.value) {
    isEditing.value = true
    editValue.value = props.rawValue ?? ''
  } else {
    emit('edit')
  }
}

function save() {
  emit('save', editValue.value)
  isEditing.value = false
  editValue.value = ''
}

function cancel() {
  isEditing.value = false
  editValue.value = ''
}

function saveImmediate(val) {
  emit('save', val)
}

watch(isEditing, (val) => {
  if (val) {
    editValue.value = props.rawValue ?? ''
    nextTick(() => {
      inputRef.value?.focus?.()
      if (fieldType.value === 'date') {
        try { inputRef.value?.showPicker?.() } catch {}
      }
    })
  }
})
</script>

<style scoped>
.detail-item {
  display: grid;
  grid-template-columns: 10rem 1fr auto;
  align-items: baseline;
  gap: 0 var(--space-sm);
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) 0;
  cursor: pointer;
}

.detail-item:last-child { border-bottom: none; }

.detail-item-editing {
  align-items: flex-start;
}

.detail-item-select {
  grid-template-columns: 10rem 1fr;
  cursor: default;
}

.select-picker-dd {
  margin: 0;
}

dt { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin: 0; }
dd { margin: 0; font-size: 0.95rem; white-space: pre-wrap; }

.value-empty { color: var(--text-muted); font-style: italic; }

.edit-btn { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); }
.detail-item:hover .edit-btn,
.detail-item:focus-within .edit-btn { opacity: 1; }

.inline-edit-row {
  grid-column: 2 / 4;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.inline-edit-input {
  font-size: 0.95rem;
}

.inline-edit-input :deep(.form-control) {
  padding: 0.3rem 0.5rem;
}

.inline-edit-actions {
  display: flex;
  gap: var(--space-xs);
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .detail-item { grid-template-columns: 1fr auto; }
  dt { grid-column: 1 / -1; margin-bottom: 2px; }
  dd { grid-column: 1; }
  .inline-edit-row { grid-column: 1 / -1; }
}
</style>
