<!--
  Jedno pole importního diffu: při přepisu zobrazí stávající (readonly, výběr Ctrl+C) a nové (editovatelné) znění.
-->
<template>
  <div class="im-diff-field">
    <div class="im-diff-field-key">{{ fieldKey }}</div>

    <div v-if="hasExistingSide" class="im-diff-columns">
      <div class="im-diff-col im-diff-col-existing">
        <label class="im-diff-col-label" :for="readonlyId">{{ t.import.diffExisting }}</label>
        <textarea
          :id="readonlyId"
          class="im-diff-readonly"
          readonly
          tabindex="0"
          :rows="readonlyRows"
          :value="existingDisplayText"
          @focus="onReadonlyFocus"
        ></textarea>
      </div>
      <div class="im-diff-col im-diff-col-new">
        <span class="im-diff-col-label">{{ t.import.diffFromImport }}</span>
        <div class="im-diff-editor-wrap">
          <ImportFieldEditor :item="item" :field-key="fieldKey" />
        </div>
      </div>
    </div>

    <div v-else class="im-diff-col-single">
      <span class="im-diff-col-label">{{ t.import.diffFromImport }}</span>
      <div class="im-diff-editor-wrap">
        <ImportFieldEditor :item="item" :field-key="fieldKey" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ImportFieldEditor from './ImportFieldEditor.vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  /** Entita z YAML (mutujeme hodnoty importovaných polí). */
  item: { type: Object, required: true },
  /** Klíč atributu. */
  fieldKey: { type: String, required: true },
  /**
   * true = řádek z režimu přepisu (vždy zobrazí sloupec „stávající“, i když v úložišti nic nebylo).
   */
  hasExistingSide: { type: Boolean, default: false },
  /** Surová hodnota z existujícího záznamu (může být undefined). */
  existingValue: { default: undefined },
})

const { t } = useI18n()

const uid = Math.random().toString(36).slice(2, 9)
const readonlyId = `im-diff-ro-${props.fieldKey}-${uid}`

/**
 * Text v readonly poli (prázdná / null jako „—“ pro přehlednost).
 * @param {unknown} v
 */
function formatExistingForDisplay(v) {
  if (v === null || v === undefined) return '—'
  if (v === '') return ''
  if (typeof v === 'boolean') return v ? t.import.diffBoolTrue : t.import.diffBoolFalse
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

const existingDisplayText = computed(() =>
  props.hasExistingSide ? formatExistingForDisplay(props.existingValue) : '',
)

const readonlyRows = computed(() => {
  const s = existingDisplayText.value || ''
  const lines = Math.max(1, s.split('\n').length)
  return Math.min(14, Math.max(2, lines))
})

/**
 * Při zaměření usnadní výběr celého textu (Ctrl+A stále funguje).
 * @param {FocusEvent} e
 */
function onReadonlyFocus(e) {
  e.target?.select?.()
}
</script>

<style scoped>
.im-diff-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border);
}

.im-diff-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.im-diff-field-key {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
}

.im-diff-columns {
  display: grid;
  /* minmax(0,1fr) — textarea nemá rozbíjet stejnou šířku sloupců */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
  align-items: start;
  width: 100%;
}

@media (max-width: 640px) {
  .im-diff-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}

.im-diff-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.im-diff-col-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.im-diff-readonly {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: var(--space-sm);
  font-size: 0.85rem;
  font-family: inherit;
  line-height: 1.45;
  color: var(--text);
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  resize: vertical;
  min-height: 2.5rem;
  cursor: text;
  user-select: text;
}

.im-diff-readonly:focus {
  outline: none;
  border-color: var(--accent);
}

.im-diff-editor-wrap {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  align-self: stretch;
}

.im-diff-editor-wrap :deep(.im-bool-edit),
.im-diff-editor-wrap :deep(.im-field-input),
.im-diff-editor-wrap :deep(input[type='number']) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.im-diff-editor-wrap :deep(.im-bool-edit) {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
}

.im-diff-col-single {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
