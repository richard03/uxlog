<template>
  <Modal :title="t.notebook.reviewTitle" size="large" @close="finish">
    <!-- Akce z AI — sdílený náhled (PendingReview*) -->
    <PendingReviewLayout>
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
/**
 * Revize akcí navržených AI ke zprávě ze zápisníku.
 * Potvrzené akce emituje jako `confirm-action`; při zavření předá _id potvrzených akcí (`close`).
 * Nepotvrzené akce se považují za přeskočené.
 */
import { ref, reactive, watch } from 'vue'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import PendingReviewLayout from './PendingReviewLayout.vue'
import PendingReviewRow from './PendingReviewRow.vue'
import PendingReviewAiFields from './PendingReviewAiFields.vue'
import { useI18n } from '../composables/useI18n.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  actions: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'confirm-action'])

const { t } = useI18n()

const pendingActions = ref(props.actions.map((a) => ({ ...a, fields: { ...a.fields } })))
const confirmedIds = []

/** Rozbalení řádku akce (klíč = _id). */
const expandedById = reactive({})

/**
 * Přepne stav rozbalení řádku.
 * @param {number} id
 */
function toggleRow(id) {
  expandedById[id] = !expandedById[id]
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
 * Zavře revizi a předá rodiči potvrzené akce.
 */
function finish() {
  emit('close', [...confirmedIds])
}

watch(() => pendingActions.value.length, (len) => {
  if (len === 0) finish()
})

/**
 * Potvrdí jednu akci — uložení do store, odebrání ze seznamu.
 * @param {object} action
 */
function confirmOne(action) {
  emit('confirm-action', action)
  confirmedIds.push(action._id)
  removeAction(action)
  showToast(t.notebook.itemImported)
}

/**
 * Přeskočí akci.
 * @param {object} action
 */
function skipOne(action) {
  removeAction(action)
  showToast(t.notebook.itemSkipped)
}

/**
 * Potvrdí všechny zbývající akce najednou.
 */
function confirmAllPending() {
  for (const action of pendingActions.value) {
    emit('confirm-action', action)
    confirmedIds.push(action._id)
  }
  showToast(t.notebook.batchImported)
  pendingActions.value = []
}

/**
 * Zahodí všechny zbývající návrhy bez zápisu do store.
 */
function rejectAllPending() {
  showToast(t.notebook.allRejected)
  pendingActions.value = []
}
</script>
