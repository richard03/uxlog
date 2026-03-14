<template>
  <Modal :title="t.notebook.title" size="large" @close="handleClose">
    <!-- Edit view -->
    <div v-if="view === 'edit'" class="nb-edit">
      <textarea
        id="notebook"
        v-model="text"
        class="nb-textarea"
        :placeholder="t.notebook.placeholder"
        :aria-label="t.notebook.title"
        autofocus
      ></textarea>
      <div v-if="aiKeyAvailable" class="nb-ai-bar">
        <button type="button" class="btn btn-secondary btn-sm" @click="runAiProcess">
          {{ t.notebook.process }}
        </button>
        <span v-if="aiError" class="nb-error" role="alert">{{ aiError }}</span>
      </div>
    </div>

    <!-- Processing view -->
    <div v-else-if="view === 'processing'" class="nb-processing" aria-live="polite">
      <p>{{ t.notebook.processing }}</p>
    </div>

    <!-- Actions view -->
    <div v-else class="nb-actions">
      <div class="nb-actions-header">
        <button type="button" class="btn btn-ghost btn-sm" @click="backToEdit">
          ← {{ t.notebook.backToEdit }}
        </button>
        <button
          v-if="aiActions.some(a => a._status === 'pending')"
          type="button"
          class="btn btn-primary btn-sm"
          @click="confirmAllActions"
        >
          {{ t.notebook.actionConfirmAll }}
        </button>
      </div>
      <div class="nb-action-list" role="list">
        <div
          v-for="action in aiActions"
          :key="action._id"
          class="nb-action-card"
          :class="`nb-action-${action._status}`"
          role="listitem"
        >
          <div class="nb-action-meta">
            <span class="nb-action-entity-badge">{{ t.notebook.entityLabels[action.entity] || action.entity }}</span>
            <span class="nb-action-type" :class="`nb-action-type-${action.type}`">
              {{ action.type === 'create' ? t.notebook.actionCreate : t.notebook.actionUpdate }}
            </span>
            <strong class="nb-action-name">{{ action.entityName }}</strong>
          </div>
          <div class="nb-action-fields">
            <div v-for="(val, key) in action.fields" :key="key" class="nb-action-field">
              <label :for="`af-${action._id}-${key}`" class="nb-field-key">{{ key }}</label>
              <textarea
                v-if="action._status === 'pending'"
                :id="`af-${action._id}-${key}`"
                class="nb-field-input"
                :value="action.fields[key]"
                @input="action.fields[key] = $event.target.value"
                rows="2"
              ></textarea>
              <span v-else class="nb-field-val">{{ val }}</span>
            </div>
          </div>
          <blockquote v-if="action.sourceText" class="nb-action-source">{{ action.sourceText }}</blockquote>
          <div v-if="action._status === 'pending'" class="nb-action-btns">
            <button type="button" class="btn btn-primary btn-sm" @click="handleConfirmAction(action)">
              {{ t.notebook.actionConfirm }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="action._status = 'skipped'">
              {{ t.notebook.actionSkip }}
            </button>
          </div>
          <div v-else class="nb-action-status">
            {{ action._status === 'confirmed' ? t.notebook.actionDone : t.notebook.actionSkipped }}
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from './Modal.vue'
import { useI18n } from '../composables/useI18n.js'
import { processNotebook, hasAiKey } from '../lib/aiProcessor.js'

const props = defineProps({
  initialText: { type: String, default: '' },
  projectData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'confirm-action'])

const { t } = useI18n()

const text = ref(props.initialText)
const view = ref('edit') // 'edit' | 'processing' | 'actions'
const aiActions = ref([])
const aiResidualText = ref('')
const aiError = ref('')
const aiKeyAvailable = ref(hasAiKey())

watch(() => props.initialText, (v) => { text.value = v }, { immediate: true })

function handleClose() {
  emit('close', text.value)
}

async function runAiProcess() {
  view.value = 'processing'
  aiError.value = ''
  aiActions.value = []
  try {
    const { actions, residualText } = await processNotebook(text.value, props.projectData)
    aiResidualText.value = residualText
    if (actions.length === 0) {
      aiError.value = t.notebook.noActions
      text.value = residualText
      view.value = 'edit'
    } else {
      aiActions.value = actions.map((a, i) => ({ ...a, _id: i, _status: 'pending' }))
      view.value = 'actions'
    }
  } catch (e) {
    aiError.value = e.message
    view.value = 'edit'
  }
}

function handleConfirmAction(action) {
  emit('confirm-action', action)
  action._status = 'confirmed'
}

function confirmAllActions() {
  for (const action of aiActions.value) {
    if (action._status === 'pending') {
      handleConfirmAction(action)
    }
  }
}

function buildNotebookFromResidual() {
  const parts = [aiResidualText.value]
  for (const a of aiActions.value) {
    if (a._status !== 'confirmed' && a.sourceText?.trim()) {
      parts.push(a.sourceText.trim())
    }
  }
  return parts.filter(Boolean).join('\n\n').trim()
}

function backToEdit() {
  text.value = buildNotebookFromResidual()
  view.value = 'edit'
  aiActions.value = []
  aiResidualText.value = ''
  aiError.value = ''
}
</script>

<style scoped>
.nb-edit {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--space-sm);
}

.nb-textarea {
  width: 100%;
  flex: 1;
  min-height: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: none;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.nb-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.nb-ai-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.nb-error {
  color: var(--error);
  font-size: 0.9rem;
}

.nb-processing {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.nb-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-md);
}

.nb-actions-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nb-action-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.nb-action-card {
  padding: var(--space-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: opacity var(--transition);
}

.nb-action-confirmed { opacity: 0.55; border-color: var(--accent); }
.nb-action-skipped { opacity: 0.35; }

.nb-action-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.nb-action-entity-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--accent-muted);
  color: var(--accent);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.nb-action-type {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.nb-action-type-create { background: var(--accent-muted); color: var(--accent); }
.nb-action-type-update { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }

.nb-action-name { font-size: 0.95rem; }

.nb-action-fields {
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nb-field-key {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.nb-field-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
  line-height: 1.4;
  transition: border-color var(--transition);
}

.nb-field-input:focus {
  outline: none;
  border-color: var(--accent);
}

.nb-field-val {
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.nb-action-source {
  margin: 0;
  padding: var(--space-xs) var(--space-sm);
  border-left: 3px solid var(--border);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-style: italic;
  line-height: 1.5;
  word-break: break-word;
}

.nb-action-btns {
  display: flex;
  gap: var(--space-sm);
}

.nb-action-status {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}
</style>
