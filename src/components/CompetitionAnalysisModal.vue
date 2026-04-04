<template>
  <Modal :title="t.competition.analyzePromptTitle" size="large" @close="$emit('close')">
    <!-- Input view -->
    <div v-if="view === 'input'" class="ca-input">
      <label for="ca-topic" class="ca-label">{{ t.competition.analyzePromptLabel }}</label>
      <textarea
        id="ca-topic"
        v-model="topic"
        class="ca-textarea"
        :placeholder="t.competition.analyzePromptPlaceholder"
        autofocus
        rows="4"
      ></textarea>
      <div class="ca-bar">
        <AppButton variant="primary" :disabled="!topic.trim()" @click="runAnalysis">
          {{ t.competition.analyzePromptSubmit }}
        </AppButton>
        <span v-if="error" class="ca-error" role="alert">{{ error }}</span>
      </div>
    </div>

    <!-- Processing view -->
    <div v-else-if="view === 'processing'" class="ca-processing" aria-live="polite">
      <p>{{ t.competition.analyzing }}</p>
    </div>

    <!-- Výsledky — sdílený náhled (PendingReview*) -->
    <div v-else class="ca-results">
      <PendingReviewLayout>
        <template #toolbar-left>
          <AppButton variant="tertiary" size="sm" @click="backToInput">
            ← {{ t.notebook.backToEdit }}
          </AppButton>
        </template>
        <template #toolbar-right>
          <template v-if="pendingActions.length">
            <AppButton variant="primary" size="sm" @click="confirmAllPending">
              {{ t.competition.analysisImportAll }}
            </AppButton>
            <AppButton variant="secondary" size="sm" @click="rejectAllPending">
              {{ t.competition.analysisRejectAll }}
            </AppButton>
          </template>
        </template>

        <PendingReviewRow
          v-for="action in pendingActions"
          :key="action._id"
          :expanded="!!expandedById[action._id]"
          :confirm-label="t.notebook.actionConfirm"
          :skip-label="t.notebook.actionSkip"
          @toggle="toggleRow(action._id)"
          @confirm="confirmOne(action)"
          @skip="skipOne(action)"
        >
          <template #summary>
            <span class="pr-badge">{{ t.competition.label }}</span>
            <span
              class="pr-type-pill"
              :class="action.type === 'update' ? 'pr-type-pill--update' : 'pr-type-pill--create'"
            >
              {{ action.type === 'update' ? t.notebook.actionUpdate : t.notebook.actionCreate }}
            </span>
            <strong class="pr-title">{{ action.entityName }}</strong>
            <span v-if="action.entityId" class="pr-meta-id">{{ t.import.rowId }}: {{ action.entityId }}</span>
          </template>
          <template #body>
            <PendingReviewAiFields
              :model="action.fields"
              :id-prefix="`cf-${action._id}`"
              :label-for-key="fieldLabel"
            />
          </template>
        </PendingReviewRow>
      </PendingReviewLayout>
    </div>
  </Modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import PendingReviewLayout from './PendingReviewLayout.vue'
import PendingReviewRow from './PendingReviewRow.vue'
import PendingReviewAiFields from './PendingReviewAiFields.vue'
import { useI18n } from '../composables/useI18n.js'
import { showToast } from '../composables/useToast.js'
import { callCapability } from '../lib/plugins/registry.js'

const props = defineProps({
  projectData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'confirm-action'])

const { t } = useI18n()

const topic = ref('')
const view = ref('input') // 'input' | 'processing' | 'results'
const pendingActions = ref([])
const error = ref('')

/** Rozbalení řádku (klíč = _id). */
const expandedById = reactive({})

const FIELD_LABELS = {
  name: () => t.competition.name,
  url: () => t.competition.url,
  description: () => t.competition.description,
  strengths: () => t.competition.strengths,
  weaknesses: () => t.competition.weaknesses,
  inspiration: () => t.competition.inspiration,
}

/**
 * Popisek pole výsledku analýzy.
 * @param {string} key
 */
function fieldLabel(key) {
  return FIELD_LABELS[key]?.() || key
}

/**
 * @param {number} id
 */
function toggleRow(id) {
  expandedById[id] = !expandedById[id]
}

/**
 * @param {Array} actions
 */
function resetExpandedFor(actions) {
  for (const k of Object.keys(expandedById)) delete expandedById[k]
  for (const a of actions) expandedById[a._id] = false
}

/**
 * @param {{ _id: number }} action
 */
function removeAction(action) {
  pendingActions.value = pendingActions.value.filter((a) => a._id !== action._id)
  delete expandedById[action._id]
}

watch(
  () => [view.value, pendingActions.value.length],
  ([v, len]) => {
    if (v !== 'results' || len > 0) return
    emit('close')
  },
)

async function runAnalysis() {
  view.value = 'processing'
  error.value = ''
  pendingActions.value = []
  try {
    const result = await callCapability('ai:competition-analysis', topic.value, props.projectData)
    if (!result?.actions?.length) {
      error.value = t.competition.analyzeNoResults
      view.value = 'input'
    } else {
      const mapped = result.actions.map((a, i) => ({ ...a, _id: i }))
      pendingActions.value = mapped
      resetExpandedFor(mapped)
      view.value = 'results'
    }
  } catch (e) {
    error.value = e.message
    view.value = 'input'
  }
}

/**
 * @param {object} action
 */
function confirmOne(action) {
  emit('confirm-action', action)
  removeAction(action)
  showToast(t.competition.analysisItemImported)
}

/**
 * @param {object} action
 */
function skipOne(action) {
  removeAction(action)
  showToast(t.competition.analysisItemSkipped)
}

function confirmAllPending() {
  for (const action of pendingActions.value) {
    emit('confirm-action', action)
  }
  showToast(t.competition.analysisBatchImported)
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
}

function rejectAllPending() {
  showToast(t.competition.analysisAllRejected)
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
}

function backToInput() {
  view.value = 'input'
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
  error.value = ''
}
</script>

<style scoped>
.ca-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ca-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.ca-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.ca-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.ca-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ca-error {
  color: var(--error);
  font-size: 0.9rem;
}

.ca-processing {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.ca-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

</style>
