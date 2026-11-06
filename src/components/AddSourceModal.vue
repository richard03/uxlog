<template>
  <Modal :title="t.source.add" size="large" @close="emit('close')">
    <form @submit.prevent="onSave">
      <div class="add-source-tabs" role="tablist">
        <button
          v-for="m in ['file', 'text']"
          :key="m"
          type="button"
          role="tab"
          class="filter-badge"
          :class="{ 'filter-badge--active': mode === m }"
          :aria-selected="mode === m"
          @click="mode = m"
        >{{ m === 'file' ? t.sources.modeFile : t.sources.modeText }}</button>
      </div>

      <template v-if="mode === 'file'">
        <div
          class="add-source-drop"
          :class="{ 'add-source-drop--over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <p class="add-source-drop-text">{{ draft.fileName || t.sources.dropHint }}</p>
          <label class="add-source-pick">
            <AppButton tag="span" variant="secondary" size="sm">{{ t.sources.chooseFile }}</AppButton>
            <input type="file" class="visually-hidden" :accept="accept" @change="onPick" />
          </label>
          <p class="add-source-formats">{{ t.sources.formats }}</p>
        </div>
        <p v-if="draft.reading" class="add-source-status" role="status">{{ t.sources.reading }}</p>
      </template>

      <FormInput v-model="draft.name" :label="t.source.name" control-id="source-name" />
      <FormSelect
        v-model="draft.kind"
        :label="t.source.kind"
        control-id="source-kind"
        :options="['document', 'interview', 'meeting', 'email', 'other'].map((k) => ({ value: k, label: t.sourceKind[k] }))"
      />
      <FormTextarea
        v-model="draft.content"
        :label="mode === 'file' ? t.sources.extractedText : t.source.content"
        control-id="source-content"
        :rows="mode === 'file' ? 10 : 14"
        :placeholder="mode === 'text' ? t.sources.pastePlaceholder : ''"
      />
      <p v-if="draft.error" class="add-source-error" role="alert">{{ draft.error }}</p>
      <p class="add-source-hint">{{ t.sources.addHint }}</p>

      <FormActions>
        <AppButton variant="secondary" @click="emit('close')">{{ t.common.cancel }}</AppButton>
        <AppButton variant="primary" native-type="submit" :disabled="draft.reading || !draft.content.trim()">{{ t.common.save }}</AppButton>
      </FormActions>
    </form>
  </Modal>
</template>

<script setup>
/**
 * Dialog „Přidat zdroj“: nahrání souboru (Word, PDF, text, e-mail) nebo vložení textu.
 * Text vytažený ze souboru jde před uložením zkontrolovat a upravit.
 */
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useAddSource } from '../composables/useAddSource.js'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import { FormInput, FormSelect, FormTextarea, FormActions } from './form'

const props = defineProps({
  projectId: { type: String, required: true },
})
const emit = defineEmits(['close', 'saved'])

const { t } = useI18n()
const { draft, reset, readFile, save, accept } = useAddSource(() => props.projectId)
reset()

const mode = ref('file')
const dragOver = ref(false)

function onPick(event) {
  readFile(event.target.files?.[0])
  event.target.value = ''
}

function onDrop(event) {
  dragOver.value = false
  readFile(event.dataTransfer?.files?.[0])
}

function onSave() {
  const source = save()
  if (source) emit('saved', source)
}
</script>

<style scoped>
.add-source-tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-md); }
.add-source-drop {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-align: center;
  margin-bottom: var(--space-md);
  transition: border-color var(--transition);
}
.add-source-drop--over { border-color: var(--accent); }
.add-source-drop-text { margin: 0 0 var(--space-sm); font-weight: 600; word-break: break-all; }
.add-source-pick { cursor: pointer; display: inline-flex; }
.add-source-formats { margin: var(--space-sm) 0 0; color: var(--text-muted); font-size: 0.8rem; }
.add-source-status { color: var(--text-muted); font-size: 0.85rem; }
.add-source-error { color: var(--error); font-size: 0.85rem; }
.add-source-hint { color: var(--text-muted); font-size: 0.8rem; margin: var(--space-sm) 0 0; }
</style>
