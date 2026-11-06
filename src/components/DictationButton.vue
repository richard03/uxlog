<template>
  <button
    v-if="dictation.available.value || dictation.active.value"
    type="button"
    class="dictation-btn"
    :class="{
      'dictation-btn--active': dictation.active.value,
      'dictation-btn--live': dictation.status.value === 'listening',
    }"
    :aria-pressed="dictation.active.value ? 'true' : 'false'"
    :aria-label="dictation.active.value ? t.dictation.stopAria : t.dictation.startAria"
    :title="dictation.active.value ? t.dictation.stop : t.dictation.start"
    :disabled="dictation.status.value === 'finishing'"
    @mousedown.prevent
    @click.stop="dictation.toggle()"
  >
    <svg v-if="!dictation.active.value" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
    <svg v-else aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  </button>
</template>

<script setup>
/**
 * Tlačítko diktování (mikrofon / stop). Stav a akce dodává `useDictation`.
 * `mousedown.prevent` drží fokus a pozici kurzoru v textovém poli.
 */
import { useI18n } from '../composables/useI18n.js'

defineProps({
  /** Výsledek useDictation() */
  dictation: { type: Object, required: true },
})

const { t } = useI18n()
</script>

<style scoped>
.dictation-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition), background var(--transition);
}

.dictation-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.dictation-btn:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.dictation-btn:disabled {
  cursor: progress;
  opacity: 0.7;
}

.dictation-btn--active {
  color: #fff;
  background: var(--error);
  border-color: var(--error);
}

.dictation-btn--active:hover:not(:disabled) {
  color: #fff;
  border-color: var(--error);
}

.dictation-btn--live {
  animation: dictation-pulse 1.6s ease-in-out infinite;
}

@keyframes dictation-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(201, 42, 42, 0.45); }
  50% { box-shadow: 0 0 0 6px rgba(201, 42, 42, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .dictation-btn--live { animation: none; }
}
</style>
