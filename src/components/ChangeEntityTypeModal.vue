<template>
  <Modal :title="t.entityConversion.title" size="large" @close="emit('close')">
    <form class="conv" @submit.prevent="doConvert">
      <!-- Posouvá se jen obsah, tlačítka zůstávají pod ním -->
      <div class="conv-scroll">
        <p class="conv-intro">{{ t.entityConversion.intro }}</p>

        <div class="conv-type">
          <FormSelect
            v-model="targetCollection"
            :label="t.entityConversion.targetType"
            control-id="conv-target-type"
            :options="targets"
          />
        </div>

        <p v-if="carriedInto" class="conv-note">{{ t.entityConversion.carriedInto(carriedInto) }}</p>

        <!-- Řádky porovnání: stejné pole původního a nového záznamu vedle sebe -->
        <div class="conv-grid">
          <h3 class="conv-col-title conv-cell--source">{{ t.entityConversion.original(sourceTypeLabel) }}</h3>
          <h3 class="conv-col-title conv-cell--target">{{ t.entityConversion.result(targetTypeLabel) }}</h3>

          <template v-for="row in rows" :key="`${targetCollection}-${row.key}`">
            <div class="conv-cell conv-cell--source">
              <template v-if="row.source">
                <span class="form-group-label conv-source-label">{{ row.source.label }}</span>
                <span v-if="row.source.text" class="conv-row-text">{{ row.source.text }}</span>
                <span v-else class="conv-row-empty">—</span>
                <span v-if="row.source.movedTo" class="conv-tag">{{ t.entityConversion.movedTo(row.source.movedTo) }}</span>
                <span v-else-if="row.source.notTransferred" class="conv-tag conv-tag--lost">{{ t.entityConversion.notTransferred }}</span>
              </template>
            </div>

            <div class="conv-cell conv-cell--target">
              <FormInput v-if="row.target === 'name'" v-model="draft.values.name" :label="t.entityConversion.name" control-id="conv-name" required />
              <FormInput v-else-if="row.target === 'code'" v-model="draft.values.code" :label="t.entityConversion.code" control-id="conv-code" :dictation="false" />
              <template v-else-if="row.target?.isCustom">
                <FormTextarea
                  v-if="row.target.type === 'textarea'"
                  v-model="draft.customFields[row.target.id]"
                  :label="row.target.label"
                  :control-id="`conv-${row.target.key}`"
                  :rows="3"
                />
                <FormSelect
                  v-else-if="row.target.type === 'select' && row.target.options?.length"
                  v-model="draft.customFields[row.target.id]"
                  :label="row.target.label"
                  :control-id="`conv-${row.target.key}`"
                  :options="[{ value: '', label: '—' }, ...row.target.options]"
                />
                <FormInput
                  v-else
                  v-model="draft.customFields[row.target.id]"
                  :label="row.target.label"
                  :control-id="`conv-${row.target.key}`"
                  :type="inputType(row.target.type)"
                  :dictation="inputType(row.target.type) === 'text'"
                />
              </template>
              <FormTextarea
                v-else-if="row.target?.type === 'textarea'"
                v-model="draft.values[row.target.key]"
                :label="row.target.label"
                :control-id="`conv-${row.target.key}`"
                :rows="row.target.key === draft.mainFieldKey ? 8 : 3"
              />
              <FormSelect
                v-else-if="row.target?.type === 'select' && row.target.options?.length"
                v-model="draft.values[row.target.key]"
                :label="row.target.label"
                :control-id="`conv-${row.target.key}`"
                :options="row.target.options"
              />
              <div v-else-if="row.target?.type === 'number-unit'" class="form-group">
                <label :for="`conv-${row.target.key}`" class="form-group-label">{{ row.target.label }}</label>
                <div class="conv-number-unit">
                  <FormInput v-model="draft.values[row.target.valueKey]" :control-id="`conv-${row.target.key}`" :dictation="false" />
                  <FormSelect
                    v-model="draft.values[row.target.unitKey]"
                    :control-id="`conv-${row.target.key}-unit`"
                    :options="row.target.units || []"
                    :aria-label="row.target.label"
                  />
                </div>
              </div>
              <FormInput
                v-else-if="row.target"
                v-model="draft.values[row.target.key]"
                :label="row.target.label"
                :control-id="`conv-${row.target.key}`"
                :type="inputType(row.target.type)"
                :dictation="inputType(row.target.type) === 'text'"
              />
            </div>
          </template>
        </div>
      </div>

      <div class="form-actions conv-actions">
        <AppButton variant="secondary" @click="emit('close')">{{ t.common.cancel }}</AppButton>
        <AppButton variant="primary" native-type="submit" :disabled="!targetCollection">{{ t.entityConversion.confirm }}</AppButton>
      </div>
    </form>
  </Modal>
</template>

<script setup>
/**
 * Dialog Změnit typ záznamu: po řádcích vlevo pole původního záznamu (u hodnoty, kam v novém záznamu
 * přešla), vpravo stejné pole upravitelného návrhu nového záznamu. Logika v useEntityConversion.
 * @prop {string} collection - kolekce převáděného záznamu (např. 'requirements')
 * @prop {Object} entity - převáděný záznam
 * @emits converted - { collection, id } nového záznamu
 */
import { useI18n } from '../composables/useI18n.js'
import { useEntityConversion } from '../composables/useEntityConversion.js'
import { showToast } from '../composables/useToast.js'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import { FormInput, FormTextarea, FormSelect } from './form'

const props = defineProps({
  collection: { type: String, required: true },
  entity: { type: Object, required: true },
})

const emit = defineEmits(['close', 'converted'])

const { t } = useI18n()

const {
  targets, targetCollection, targetCodePrefix, draft, rows,
  carriedInto, sourceTypeLabel, targetTypeLabel, convert,
} = useEntityConversion(props.collection, () => props.entity)

/** Typ pole → typ inputu (volby bez definice, např. řešitel úkolu, se píšou jako text). */
function inputType(type) {
  return ['url', 'email', 'tel', 'date'].includes(type) ? type : 'text'
}

function doConvert() {
  const label = targetTypeLabel.value
  const result = convert()
  if (!result) {
    showToast(t.entityConversion.failed)
    return
  }
  showToast(t.entityConversion.done(label))
  emit('converted', result)
}
</script>

<style scoped>
/* Formulář vyplní tělo dialogu: nahoře posouvaný obsah, dole tlačítka */
.conv {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.conv-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-bottom: var(--space-md);
}

.conv-intro,
.conv-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.conv-type {
  max-width: 20rem;
}

/* Dva sloupce, společné řádky – stejné pole obou záznamů je ve stejné výšce */
.conv-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: var(--space-md);
}

.conv-col-title {
  margin: 0;
  padding: var(--space-md) var(--space-md) var(--space-sm);
  font-size: 1rem;
}

.conv-cell {
  min-width: 0;
  padding: var(--space-xs) var(--space-md);
}

.conv-cell--source {
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.conv-col-title.conv-cell--source {
  display: block;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.conv-source-label {
  display: block;
}

.conv-row-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.conv-row-empty {
  color: var(--text-muted);
}

.conv-tag {
  font-size: 0.75rem;
  color: var(--accent);
}

.conv-tag--lost {
  color: var(--text-muted);
}

.conv-number-unit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 10rem);
  gap: var(--space-md);
}

.conv-actions {
  flex-shrink: 0;
  margin-top: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}

@media (max-width: 800px) {
  .conv-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
