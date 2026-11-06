<template>
  <div class="dictation-status" role="status" aria-live="polite">
    <p
      v-if="message"
      class="dictation-status__msg"
      :class="`dictation-status__msg--${message.kind}`"
    >
      <span v-if="message.kind === 'live'" class="dictation-status__dot" aria-hidden="true" />
      <span>{{ message.text }}</span>
      <template v-if="!dictation.active.value">
        <button
          v-if="message.kind === 'error' && dictation.available.value"
          type="button"
          class="dictation-status__action"
          @mousedown.prevent
          @click.stop="dictation.start()"
        >{{ t.dictation.retry }}</button>
        <button
          type="button"
          class="dictation-status__action"
          :aria-label="t.dictation.dismiss"
          @click.stop="dictation.dismiss()"
        >×</button>
      </template>
    </p>
  </div>
</template>

<script setup>
/**
 * Stavový řádek diktování pod textovým polem: průběh, pomalý server, chyba se „Zkusit znovu“.
 * Oblast `aria-live` je v DOM vždy, aby čtečky hlásily změny.
 */
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  /** Výsledek useDictation() */
  dictation: { type: Object, required: true },
})

const { t } = useI18n()
const message = computed(() => props.dictation.message.value)
</script>

<style scoped>
.dictation-status:empty {
  display: none;
}

.dictation-status__msg {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  margin: var(--space-xs) 0 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.dictation-status__msg--warning {
  color: var(--warning);
}

.dictation-status__msg--error {
  color: var(--error);
}

.dictation-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--error);
  animation: dictation-blink 1.2s ease-in-out infinite;
}

@keyframes dictation-blink {
  50% { opacity: 0.3; }
}

@media (prefers-reduced-motion: reduce) {
  .dictation-status__dot { animation: none; }
}

.dictation-status__action {
  border: none;
  background: none;
  padding: 0 2px;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.dictation-status__action:hover {
  text-decoration: underline;
}

.dictation-status__action:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
