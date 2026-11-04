<template>
  <div class="pr-merge">
    <!-- Kam návrh uložit: nový záznam, nebo sloučit do existujícího -->
    <div class="pr-merge-target">
      <label class="pr-merge-target-label">
        {{ t.notebook.mergeTarget }}
        <select class="pr-merge-select" :value="action.type === 'update' ? action.entityId : ''" @change="onTargetChange">
          <option value="">{{ t.notebook.mergeTargetNew }}</option>
          <option v-for="c in candidates" :key="c.id" :value="c.id">{{ t.notebook.mergeTargetInto(c.label) }}</option>
        </select>
      </label>
      <span v-if="action.merge === 'pending'" class="pr-merge-status" role="status">{{ t.notebook.merging }}</span>
      <span v-else-if="action.merge === 'failed'" class="pr-merge-status pr-merge-status--warn" role="status">
        {{ t.notebook.mergeFailed }}
        <AppButton variant="tertiary" size="sm" @click="$emit('remerge')">{{ t.notebook.mergeRetry }}</AppButton>
      </span>
    </div>

    <div class="pr-merge-grid" :class="{ 'pr-merge-grid--create': action.type !== 'update' }">
      <!-- Vlevo: současný stav záznamu -->
      <section v-if="action.type === 'update'" class="pr-merge-col" :aria-label="t.notebook.mergeOriginal">
        <h4 class="pr-merge-heading">{{ t.notebook.mergeOriginal }}</h4>
        <p v-if="!action.original" class="pr-merge-empty">…</p>
        <dl v-else class="pr-merge-dl">
          <template v-for="f in originalFields" :key="f.key">
            <dt>{{ f.label }}</dt>
            <dd :class="{ 'pr-merge-changed': changes[f.key] !== undefined }">{{ display(f, action.original[f.key]) }}</dd>
          </template>
        </dl>
      </section>

      <!-- Uprostřed: citace z nového textu -->
      <section class="pr-merge-col" :aria-label="t.notebook.mergeQuotes">
        <h4 class="pr-merge-heading">{{ t.notebook.mergeQuotes }}</h4>
        <p v-if="!action.quotes.length" class="pr-merge-empty">{{ t.notebook.mergeNoQuotes }}</p>
        <blockquote
          v-for="(q, i) in action.quotes"
          :key="i"
          class="pr-merge-quote"
          :class="{ 'pr-merge-quote--unverified': !q.verified }"
        >
          {{ q.text }}
          <small v-if="!q.verified" class="pr-merge-note">{{ t.notebook.quoteUnverified }}</small>
        </blockquote>
      </section>

      <!-- Vpravo: upravitelný návrh -->
      <section class="pr-merge-col" :aria-label="t.notebook.mergeProposal">
        <h4 class="pr-merge-heading">{{ t.notebook.mergeProposal }}</h4>
        <p v-if="action.merge === 'pending'" class="pr-merge-empty">{{ t.notebook.merging }}</p>
        <template v-else>
          <p v-if="action.type === 'update' && !primaryFields.length" class="pr-merge-empty">{{ t.notebook.mergeNothing }}</p>
          <div v-for="f in primaryFields" :key="f.key" class="pr-field">
            <label :for="`${idPrefix}-${f.key}`" class="pr-field-key">{{ f.label }}</label>
            <select
              v-if="f.type === 'select' && f.options.length"
              :id="`${idPrefix}-${f.key}`"
              class="pr-field-input"
              :value="action.proposal[f.key] ?? ''"
              @change="action.proposal[f.key] = $event.target.value"
            >
              <option v-if="!hasOption(f, action.proposal[f.key])" :value="action.proposal[f.key] ?? ''">{{ action.proposal[f.key] || '—' }}</option>
              <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label || '—' }}</option>
            </select>
            <textarea
              v-else
              :id="`${idPrefix}-${f.key}`"
              class="pr-field-input"
              :class="{ 'pr-merge-changed': changes[f.key] !== undefined }"
              :value="action.proposal[f.key] ?? ''"
              :rows="rows(action.proposal[f.key])"
              @input="action.proposal[f.key] = $event.target.value"
            ></textarea>
            <p v-if="f.key === 'name' && !String(action.proposal.name ?? '').trim()" class="pr-merge-warning" role="alert">
              {{ t.notebook.nameRequired }}
            </p>
            <p v-for="(a, i) in alteredFor(f.key)" :key="i" class="pr-merge-warning" role="alert">
              {{ t.notebook.quoteAltered(a.text) }}
            </p>
          </div>
          <details v-if="action.type === 'update' && otherFields.length" class="pr-merge-other">
            <summary>{{ t.notebook.mergeOtherFields(otherFields.length) }}</summary>
            <div v-for="f in otherFields" :key="f.key" class="pr-field">
              <label :for="`${idPrefix}-${f.key}`" class="pr-field-key">{{ f.label }}</label>
              <select
                v-if="f.type === 'select' && f.options.length"
                :id="`${idPrefix}-${f.key}`"
                class="pr-field-input"
                :value="action.proposal[f.key] ?? ''"
                @change="action.proposal[f.key] = $event.target.value"
              >
                <option v-if="!hasOption(f, action.proposal[f.key])" :value="action.proposal[f.key] ?? ''">{{ action.proposal[f.key] || '—' }}</option>
                <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label || '—' }}</option>
              </select>
              <textarea
                v-else
                :id="`${idPrefix}-${f.key}`"
                class="pr-field-input"
                :class="{ 'pr-merge-changed': changes[f.key] !== undefined }"
                :value="action.proposal[f.key] ?? ''"
                :rows="rows(action.proposal[f.key])"
                @input="action.proposal[f.key] = $event.target.value"
              ></textarea>
            </div>
          </details>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * Revize jednoho návrhu AI ve třech sloupcích: současný stav záznamu | citace z nového textu |
 * upravitelný návrh (u úpravy už sloučený s původním obsahem). Návrh se upravuje přímo
 * v action.proposal (reaktivní akce z revize). Nad sloupci volba „Uložit jako“ – nový záznam,
 * nebo sloučit do existujícího záznamu stejného typu.
 */
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  /** Reaktivní akce z revize (type, entityId, quotes, original, proposal, focusKeys, merge…). */
  action: { type: Object, required: true },
  /** Pole typu entity: [{ key, label, type, options }]. */
  fields: { type: Array, required: true },
  /** Existující záznamy stejného typu: [{ id, label }]. */
  candidates: { type: Array, default: () => [] },
  /** Změněná pole návrhu (klíč → hodnota). */
  changes: { type: Object, default: () => ({}) },
  /** Citace v návrhu, které se liší od podkladu: [{ field, text }]. */
  altered: { type: Array, default: () => [] },
  idPrefix: { type: String, required: true },
})

const emit = defineEmits(['merge-into', 'revert', 'remerge'])

const { t } = useI18n()

const byKey = computed(() => new Map(props.fields.map((f) => [f.key, f])))

/** Pole návrhu nahoře: u úpravy ta, která AI změnila, u nového záznamu navržená. */
const primaryFields = computed(() =>
  (props.action.focusKeys || []).map((k) => byKey.value.get(k) || { key: k, label: k, type: 'textarea', options: [] }),
)

/** Ostatní pole záznamu (beze změny) – sbalená, aby šla případně upravit. */
const otherFields = computed(() => {
  const focus = new Set(props.action.focusKeys || [])
  return props.fields.filter((f) => !focus.has(f.key))
})

/** Pole původního záznamu k zobrazení: vyplněná nebo měněná. */
const originalFields = computed(() =>
  props.fields.filter((f) => String(props.action.original?.[f.key] ?? '').trim() || props.changes[f.key] !== undefined),
)

function onTargetChange(event) {
  const id = event.target.value
  if (id) emit('merge-into', id)
  else emit('revert')
}

function hasOption(field, value) {
  return field.options.some((o) => o.value === (value ?? ''))
}

/** Hodnota pole pro zobrazení (u výběru popisek volby). */
function display(field, value) {
  const v = value == null ? '' : String(value)
  if (!v.trim()) return '—'
  if (field.type === 'select') return field.options.find((o) => o.value === v)?.label || v
  return v
}

/** Výška textového pole podle obsahu. */
function rows(value) {
  const s = String(value ?? '')
  const lines = s.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 60)), 0)
  return Math.min(14, Math.max(2, lines))
}

function alteredFor(key) {
  return props.altered.filter((a) => a.field === key)
}
</script>
