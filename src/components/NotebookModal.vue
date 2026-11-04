<template>
  <Modal :title="t.notebook.reviewTitle" size="large" @close="finish">
    <!-- Akce z AI — sdílený náhled (PendingReview*) -->
    <PendingReviewLayout>
      <template #toolbar-right>
        <template v-if="pendingActions.length">
          <AppButton variant="primary" size="sm" :disabled="!readyActions.length" @click="confirmAllPending">
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
        @toggle="toggleRow(action._id)"
      >
        <template #summary>
          <span class="pr-badge">{{ t.notebook.entityLabels[action.entity] || action.entity }}</span>
          <span
            class="pr-type-pill"
            :class="action.type === 'update' ? 'pr-type-pill--update' : 'pr-type-pill--create'"
          >
            {{ action.type === 'create' ? t.notebook.actionCreate : t.notebook.actionUpdate }}
          </span>
          <strong class="pr-title">{{ (action.type === 'create' ? action.proposal?.name : action.entityName) || t.notebook.untitled }}</strong>
          <span v-if="action.merge === 'pending'" class="pr-merge-status pr-merge-status--inline">{{ t.notebook.merging }}</span>
        </template>
        <template #actions>
          <AppButton
            variant="primary"
            size="sm"
            :disabled="!canConfirm(action)"
            :title="helpers.nameMissing(action) ? t.notebook.nameRequired : undefined"
            @click="confirmOne(action)"
          >
            {{ t.notebook.actionConfirm }}
          </AppButton>
          <AppButton variant="tertiary" size="sm" @click="skipOne(action)">
            {{ t.notebook.actionSkip }}
          </AppButton>
        </template>
        <template #body>
          <NotebookMergeColumns
            :action="action"
            :fields="helpers.fieldMeta(action.entity)"
            :candidates="helpers.candidates(action.entity)"
            :changes="helpers.actionChanges(action)"
            :altered="helpers.alteredQuotes(action)"
            :id-prefix="`af-${action._id}`"
            @merge-into="(id) => helpers.mergeInto(action, id)"
            @revert="helpers.revertToCreate(action)"
            @remerge="helpers.remerge(action)"
          />
        </template>
      </PendingReviewRow>
    </PendingReviewLayout>
  </Modal>
</template>

<script setup>
/**
 * Revize akcí navržených AI ke zprávě ze zápisníku.
 * Akce jsou reaktivní objekty z revize v useNotebookChat (výsledek slučování do existujícího
 * záznamu do nich dorazí až po otevření). Potvrzené akce emituje jako `confirm-action`;
 * při zavření předá _id potvrzených akcí (`close`). Nepotvrzené akce se považují za přeskočené.
 */
import { ref, reactive, computed, watch } from 'vue'
import Modal from './Modal.vue'
import AppButton from './AppButton.vue'
import PendingReviewLayout from './PendingReviewLayout.vue'
import PendingReviewRow from './PendingReviewRow.vue'
import NotebookMergeColumns from './NotebookMergeColumns.vue'
import { useI18n } from '../composables/useI18n.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  actions: { type: Array, default: () => [] },
  /** reviewHelpers z useNotebookChat (fieldMeta, candidates, mergeInto, revertToCreate, remerge, actionChanges, alteredQuotes). */
  helpers: { type: Object, required: true },
})

const emit = defineEmits(['close', 'confirm-action'])

const { t } = useI18n()

/** _id vyřízených akcí (potvrzených i přeskočených). */
const handled = ref(new Set())
const confirmedIds = []

const pendingActions = computed(() => props.actions.filter((a) => !handled.value.has(a._id)))
/**
 * Jde akci potvrdit? Ne, dokud běží slučování nebo když návrh nemá název.
 * @param {Object} action
 */
function canConfirm(action) {
  return action.merge !== 'pending' && !props.helpers.nameMissing(action)
}

/** Akce, které jde potvrdit. */
const readyActions = computed(() => pendingActions.value.filter(canConfirm))

/** Rozbalení řádku akce (klíč = _id) – jediný návrh je rozbalený rovnou. */
const expandedById = reactive(props.actions.length === 1 ? { [props.actions[0]._id]: true } : {})

/**
 * Přepne stav rozbalení řádku.
 * @param {number} id
 */
function toggleRow(id) {
  expandedById[id] = !expandedById[id]
}

/**
 * Označí akci jako vyřízenou.
 * @param {{ _id: number }} action
 */
function markHandled(action) {
  handled.value = new Set([...handled.value, action._id])
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
  if (!canConfirm(action)) return
  emit('confirm-action', action)
  confirmedIds.push(action._id)
  markHandled(action)
  showToast(t.notebook.itemImported)
}

/**
 * Přeskočí akci.
 * @param {object} action
 */
function skipOne(action) {
  markHandled(action)
  showToast(t.notebook.itemSkipped)
}

/**
 * Potvrdí všechny zbývající akce, u kterých už doběhlo slučování.
 */
function confirmAllPending() {
  const ready = readyActions.value
  for (const action of ready) {
    emit('confirm-action', action)
    confirmedIds.push(action._id)
  }
  handled.value = new Set([...handled.value, ...ready.map((a) => a._id)])
  showToast(t.notebook.batchImported)
}

/**
 * Zahodí všechny zbývající návrhy bez zápisu do store.
 */
function rejectAllPending() {
  showToast(t.notebook.allRejected)
  handled.value = new Set(props.actions.map((a) => a._id))
}
</script>
