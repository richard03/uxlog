<template>
  <AppButton
    v-if="running"
    variant="tertiary"
    size="sm"
    class="ai-cancel"
    :aria-label="t.ai.cancelAria"
    @click="cancel"
  >{{ t.ai.cancel }}</AppButton>
</template>

<script setup>
/**
 * Tlačítko Zrušit k ukazateli „AI pracuje…“ – zruší probíhající požadavky na AI.
 * Zobrazí se jen, když nějaký požadavek běží.
 */
import { useI18n } from '../composables/useI18n.js'
import { useAiRequests } from '../composables/useAiRequests.js'
import AppButton from './AppButton.vue'

const { t } = useI18n()
const { running, cancel } = useAiRequests()
</script>

<style scoped>
.ai-cancel {
  margin-left: var(--space-md);
}
</style>
