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
        <AppButton variant="secondary" size="sm" @click="runAiProcess">
          {{ t.notebook.process }}
        </AppButton>
        <span v-if="aiError" class="nb-error" role="alert">{{ aiError }}</span>
      </div>
    </div>

    <!-- Processing view -->
    <div v-else-if="view === 'processing'" class="nb-processing" aria-live="polite">
      <p>{{ t.notebook.processing }}</p>
    </div>

    <!-- Akce z AI — sdílený náhled (PendingReview*) -->
    <PendingReviewLayout v-else>
      <template #toolbar-left>
        <AppButton variant="tertiary" size="sm" @click="backToEdit">
          ← {{ t.notebook.backToEdit }}
        </AppButton>
      </template>
      <template #toolbar-right>
        <template v-if="pendingActions.length">
          <AppButton variant="primary" size="sm" @click="confirmAllPending">
            {{ t.notebook.actionConfirmAll }}
          </AppButton>
          <AppButton variant="secondary" size="sm" @click="rejectAllPending">
            {{ t.notebook.rejectAll }}
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
          <span class="pr-badge">{{ t.notebook.entityLabels[action.entity] || action.entity }}</span>
          <span
            class="pr-type-pill"
            :class="action.type === 'update' ? 'pr-type-pill--update' : 'pr-type-pill--create'"
          >
            {{ action.type === 'create' ? t.notebook.actionCreate : t.notebook.actionUpdate }}
          </span>
          <strong class="pr-title">{{ action.entityName }}</strong>
          <span v-if="action.entityId" class="pr-meta-id">{{ t.import.rowId }}: {{ action.entityId }}</span>
        </template>
        <template #body>
          <PendingReviewAiFields :model="action.fields" :id-prefix="`af-${action._id}`" />
          <blockquote v-if="action.sourceText" class="pr-source">{{ action.sourceText }}</blockquote>
        </template>
      </PendingReviewRow>
    </PendingReviewLayout>
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
import { hasCapability, callCapability } from '../lib/plugins/registry.js'

const props = defineProps({
  initialText: { type: String, default: '' },
  projectData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'confirm-action'])

const { t } = useI18n()

const text = ref(props.initialText)
const view = ref('edit') // 'edit' | 'processing' | 'actions'
const pendingActions = ref([])
const aiResidualText = ref('')
const aiError = ref('')
const aiKeyAvailable = ref(hasCapability('ai:available') && callCapability('ai:available'))

/** Rozbalení řádku akce (klíč = _id). */
const expandedById = reactive({})

watch(() => props.initialText, (v) => { text.value = v }, { immediate: true })

/**
 * Přepne stav rozbalení řádku.
 * @param {number} id
 */
function toggleRow(id) {
  expandedById[id] = !expandedById[id]
}

/**
 * Vymaže stav rozbalení a připraví mapu pro nové akce.
 * @param {Array} actions
 */
function resetExpandedFor(actions) {
  for (const k of Object.keys(expandedById)) delete expandedById[k]
  for (const a of actions) expandedById[a._id] = false
}

/**
 * Připojí text zdroje ke zbytku zápisníku (při přeskočení akce).
 * @param {{ sourceText?: string }} action
 */
function mergeSkippedSource(action) {
  if (!action.sourceText?.trim()) return
  aiResidualText.value = [aiResidualText.value, action.sourceText.trim()].filter(Boolean).join('\n\n')
}

/**
 * Složí výsledný text zápisníku z AI zbytku a zdrojů nepotvrzených akcí.
 */
function buildFinalNotebookText() {
  const parts = [aiResidualText.value]
  for (const a of pendingActions.value) {
    if (a.sourceText?.trim()) parts.push(a.sourceText.trim())
  }
  return parts.filter(Boolean).join('\n\n').trim()
}

/**
 * Odebere akci ze seznamu.
 * @param {{ _id: number }} action
 */
function removeAction(action) {
  pendingActions.value = pendingActions.value.filter((a) => a._id !== action._id)
  delete expandedById[action._id]
}

/**
 * Zavře modal a předá rodiči finální text zápisníku.
 */
function finishAndClose() {
  emit('close', buildFinalNotebookText())
}

/**
 * Handler zavření (křížek / overlay) — zohlední režim akcí.
 */
function handleClose() {
  const out = view.value === 'actions' ? buildFinalNotebookText() : text.value
  emit('close', out)
}

watch(
  () => [view.value, pendingActions.value.length],
  ([v, len]) => {
    if (v !== 'actions' || len > 0) return
    finishAndClose()
  },
)

async function runAiProcess() {
  view.value = 'processing'
  aiError.value = ''
  pendingActions.value = []
  try {
    const { actions, residualText } = await callCapability('ai:notebook', text.value, props.projectData)
    aiResidualText.value = residualText
    if (actions.length === 0) {
      aiError.value = t.notebook.noActions
      text.value = residualText
      view.value = 'edit'
    } else {
      const mapped = actions.map((a, i) => ({ ...a, _id: i }))
      pendingActions.value = mapped
      resetExpandedFor(mapped)
      view.value = 'actions'
    }
  } catch (e) {
    aiError.value = e.message
    view.value = 'edit'
  }
}

/**
 * Potvrdí jednu akci — uložení do store, odebrání ze seznamu.
 * @param {object} action
 */
function confirmOne(action) {
  emit('confirm-action', action)
  removeAction(action)
  showToast(t.notebook.itemImported)
}

/**
 * Přeskočí akci — vrátí zdroj do zbytku a odebere ze seznamu.
 * @param {object} action
 */
function skipOne(action) {
  mergeSkippedSource(action)
  removeAction(action)
  showToast(t.notebook.itemSkipped)
}

/**
 * Potvrdí všechny zbývající akce najednou.
 */
function confirmAllPending() {
  for (const action of pendingActions.value) {
    emit('confirm-action', action)
  }
  showToast(t.notebook.batchImported)
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
}

/**
 * Zahodí všechny návrhy bez zápisu do store.
 */
function rejectAllPending() {
  for (const action of pendingActions.value) {
    mergeSkippedSource(action)
  }
  showToast(t.notebook.allRejected)
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
}

function backToEdit() {
  text.value = buildFinalNotebookText()
  view.value = 'edit'
  pendingActions.value = []
  for (const k of Object.keys(expandedById)) delete expandedById[k]
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

</style>
