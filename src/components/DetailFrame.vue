<template>
  <SectionCard v-if="!inCanvas" class="detail-frame">
    <slot />
  </SectionCard>
  <div v-else class="detail-frame detail-frame--plain">
    <slot />
  </div>
</template>

<script setup>
/**
 * Rámeček kolem detailu entity (nadpis, vlastnosti, texty) – Souvislosti zůstávají pod ním mimo rámeček.
 * V okně nad plátnem rámeček není (okno je rámeček samo).
 */
import SectionCard from './SectionCard.vue'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'

const { inCanvas } = useEntityNavigation()
</script>

<style scoped>
.detail-frame {
  margin-top: 0;
  margin-bottom: var(--space-lg);
}

/* Nadpis detailu začíná u horního okraje rámečku */
.detail-frame > :deep(:first-child) {
  margin-top: 0;
}

.detail-frame--plain {
  margin-bottom: 0;
}
</style>
