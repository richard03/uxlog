<template>
  <section class="nb-chat" aria-labelledby="notebook-heading">
    <h2 id="notebook-heading" class="nb-chat-title">{{ t.notebook.title }}</h2>

    <!-- Rámeček s historií a polem pro zprávu (nadpis zůstává nad ním jako u ostatních sloupců) -->
    <div class="nb-frame">
      <ol ref="historyEl" class="nb-history" :class="{ 'nb-history--more-above': moreAbove }" @scroll="onHistoryScroll" :aria-label="t.notebook.historyLabel" aria-live="polite">
        <li v-if="!history.length" class="nb-empty">{{ t.notebook.emptyHistory }}</li>
        <li v-for="entry in history" :key="entry.id" class="nb-entry">
          <div class="nb-bubble nb-bubble--user">
            <span v-if="entry.id === legacyId" class="nb-meta">{{ t.notebook.legacyLabel }}</span>
            <span v-else-if="entry.createdAt" class="nb-meta">
              <template v-if="entry.mode === 'ask'">{{ t.notebook.askLabel }} · </template>{{ formatStatusBarDateTime(entry.createdAt) }}
            </span>
            <ExpandableText>
              <p class="nb-text">{{ entry.text }}</p>
            </ExpandableText>
          </div>

          <div v-if="entry.id !== legacyId" class="nb-bubble nb-bubble--ai" :class="`nb-bubble--${displayStatus(entry)}`">
            <template v-if="displayStatus(entry) === 'processing'">{{ entry.mode === 'ask' ? t.notebook.askProcessing : t.notebook.processing }}</template>
            <template v-else-if="displayStatus(entry) === 'review'">
              {{ t.notebook.reviewPending }}
            </template>
            <template v-else-if="displayStatus(entry) === 'saved'">{{ t.notebook.savedWithoutAi }}</template>
            <template v-else-if="displayStatus(entry) === 'error' || displayStatus(entry) === 'interrupted'">
              <span role="alert">{{ displayStatus(entry) === 'error' ? entry.error : t.notebook.interrupted }}</span>
              <AppButton v-if="aiAvailable" variant="tertiary" size="sm" @click="retry(entry.id)">{{ t.notebook.retry }}</AppButton>
            </template>
            <ExpandableText v-else-if="entry.mode === 'ask'">
              <p class="nb-text nb-answer">{{ entry.answer || t.notebook.emptyAnswer }}</p>
            </ExpandableText>
            <template v-else-if="!entry.outcomes.length">{{ t.notebook.noActions }}</template>
            <ExpandableText v-else>
              <span>{{ t.notebook.outcomeSummary(countOutcomes(entry.outcomes)) }}</span>
              <ul class="nb-outcomes">
                <li
                  v-for="(o, i) in entry.outcomes"
                  :key="i"
                  :class="o.outcome === 'confirmed' ? 'nb-outcome--confirmed' : 'nb-outcome--skipped'"
                >
                  {{ o.outcome === 'confirmed' ? t.notebook.actionDone : t.notebook.actionSkipped }}
                  · {{ t.notebook.entityLabels[o.entity] || o.entity }}
                  ({{ o.type === 'update' ? t.notebook.actionUpdate : t.notebook.actionCreate }}):
                  <strong>{{ o.entityName }}</strong>
                </li>
              </ul>
              <p v-if="entry.error" class="nb-warning" role="status">{{ entry.error }}</p>
            </ExpandableText>
          </div>
        </li>
      </ol>

      <form class="nb-compose" @submit.prevent="submit">
        <textarea
          v-model="draft"
          class="nb-input"
          rows="4"
          :placeholder="mode === 'ask' ? t.notebook.askPlaceholder : t.notebook.placeholder"
          :aria-label="t.notebook.inputLabel"
          @keydown.enter.ctrl.prevent="submit"
          @keydown.enter.meta.prevent="submit"
        ></textarea>
        <div class="nb-compose-bar">
          <span class="nb-hint">{{ hint }}</span>
          <div class="nb-compose-actions">
            <select v-model="mode" class="nb-mode" :aria-label="t.notebook.modeLabel">
              <option value="ask">{{ t.notebook.modeAsk }}</option>
              <option value="process">{{ t.notebook.modeProcess }}</option>
            </select>
            <AppButton variant="primary" size="sm" native-type="submit" :disabled="!canSubmit">
              {{ submitLabel }}
            </AppButton>
          </div>
        </div>
      </form>
    </div>

    <NotebookModal
      v-if="currentReview"
      :key="currentReview.entryId"
      :actions="currentReview.actions"
      @confirm-action="applyAction"
      @close="finishReview"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import AppButton from './AppButton.vue'
import NotebookModal from './NotebookModal.vue'
import ExpandableText from './ExpandableText.vue'
import { useI18n } from '../composables/useI18n.js'
import { useNotebookChat } from '../composables/useNotebookChat.js'
import { formatStatusBarDateTime } from '../utils/formatDate.js'

const props = defineProps({
  projectId: { type: String, required: true },
})

const { t } = useI18n()
const {
  history, aiAvailable, displayStatus, send, retry, currentReview, applyAction, finishReview,
  countOutcomes, legacyEntryId: legacyId,
} = useNotebookChat(() => props.projectId)
const draft = ref('')
const historyEl = ref(null)
/** Nad viditelnou částí historie jsou starší zprávy (zobrazí se přechod nahoře). */
const moreAbove = ref(false)
/** Uživatel je u nejnovější zprávy – dodatečné změny obsahu (např. „Zobrazit celé“) ho mají nechat dole. */
let atBottom = true
let mutationObserver = null
let resizeObserver = null

function onHistoryScroll() {
  const el = historyEl.value
  if (!el) return
  moreAbove.value = el.scrollTop > 0
  atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 4
}

/** Režim zprávy: 'ask' – „Zeptat se“ (AI jen odpoví), 'process' – „Vložit informace“ (AI navrhne zápis). */
const mode = ref('process')

/** Dotaz bez AI nejde odeslat; vložení informací bez AI se jen uloží. */
const canSubmit = computed(() => !!draft.value.trim() && (mode.value !== 'ask' || aiAvailable.value))

const submitLabel = computed(() => {
  if (mode.value === 'ask') return t.notebook.sendQuestion
  return aiAvailable.value ? t.notebook.process : t.notebook.save
})

const hint = computed(() => {
  if (!aiAvailable.value) return mode.value === 'ask' ? t.notebook.askNoAiHint : t.notebook.noAiHint
  return t.notebook.sendHint
})

/** Odešle koncept zprávy; po přijetí vyprázdní pole. */
function submit() {
  if (!canSubmit.value) return
  if (send(draft.value, mode.value)) draft.value = ''
}

/** Posune historii na nejnovější zprávu. */
function scrollToBottom() {
  nextTick(() => {
    if (historyEl.value) historyEl.value.scrollTop = historyEl.value.scrollHeight
    onHistoryScroll()
  })
}

// Historie je computed → nové pole při každé změně (nová zpráva i odpověď AI)
watch(history, scrollToBottom)

onMounted(() => {
  scrollToBottom()
  // Webový font se načítá až po prvním vykreslení – texty se přelijí a zprávy zvětší
  document.fonts?.ready.then(() => { if (atBottom) scrollToBottom() })
  // Přibyl-li prvek (např. tlačítko „Zobrazit celé“ po změření textu), zůstaň u nejnovější zprávy.
  // Sleduje jen childList – rozbalení zprávy (změna stylu/textu) historií neposouvá.
  if (typeof MutationObserver !== 'undefined' && historyEl.value) {
    mutationObserver = new MutationObserver(() => { if (atBottom) scrollToBottom() })
    mutationObserver.observe(historyEl.value, { childList: true, subtree: true })
  }
  // Výška historie se mění s výškou sloupce (např. po změření hlavičky v ProjectLayout) – zůstaň dole
  if (typeof ResizeObserver !== 'undefined' && historyEl.value) {
    resizeObserver = new ResizeObserver(() => { if (atBottom) scrollToBottom() })
    resizeObserver.observe(historyEl.value)
  }
})

onBeforeUnmount(() => {
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.nb-chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Rámeček jako .counter-card (CounterCard.vue) */
.nb-frame {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
  padding: var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.nb-chat-title {
  display: flex;
  align-items: center;
  min-height: 2rem;
  /* stejná mezera pod nadpisem jako u ostatních sloupců */
  margin: 0 0 var(--space-md);
  font-size: 1rem;
  font-weight: 600;
}

.nb-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  /* Výšku určuje rodič (sticky sloupec layoutu); historie se posouvá kolečkem/dotykem, ale bez viditelného scrollbaru */
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  scrollbar-width: none;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.nb-history::-webkit-scrollbar {
  display: none;
}

/* Starší zprávy nahoře plynule mizí – naznačuje, že historie pokračuje */
.nb-history--more-above {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 var(--space-xl));
  mask-image: linear-gradient(to bottom, transparent 0, #000 var(--space-xl));
}

.nb-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.nb-entry {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nb-bubble {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  line-height: 1.5;
}

.nb-bubble--user {
  align-self: flex-end;
  max-width: 90%;
  background: var(--accent-muted);
  border: 1px solid var(--border);
}

.nb-bubble--ai {
  align-self: flex-start;
  max-width: 90%;
  /* Uvnitř rámečku (bg-elevated) musí být bublina odlišná – použije barvu pozadí stránky */
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.nb-bubble--error,
.nb-bubble--interrupted {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  color: var(--error);
}

.nb-meta {
  display: block;
  margin-bottom: var(--space-xs);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.nb-text {
  margin: 0;
  color: var(--text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.nb-outcomes {
  margin: var(--space-xs) 0 0;
  padding-left: var(--space-md);
}

.nb-outcome--confirmed {
  color: var(--text);
}

.nb-compose {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.nb-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color var(--transition);
}

.nb-input:focus {
  outline: none;
  border-color: var(--accent);
}

.nb-compose-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

@media (max-width: 800px) {
  .nb-history {
    max-height: 60vh;
  }
}

.nb-compose-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-xs);
}

.nb-compose-actions :deep(.btn) {
  white-space: nowrap;
}

.nb-mode {
  padding: 3px 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.nb-mode:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

.nb-warning {
  margin: var(--space-xs) 0 0;
  color: var(--warning);
}

.nb-answer {
  color: var(--text);
}

.nb-hint {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
