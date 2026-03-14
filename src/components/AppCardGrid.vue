<template>
  <nav class="app-card-grid" :aria-label="ariaLabel">
    <slot />
  </nav>
</template>

<script setup>
/**
 * Mřížka pro kartičky – 5 sloupců na desktopu, 3 na tabletu, 2 na mobilu.
 * Vhodná pro CounterCard i jiné typy karet.
 * @param {string} ariaLabel - aria-label pro přístupnost navigace
 */
defineProps({
  ariaLabel: { type: String, default: '' },
})
</script>

<style scoped>
.app-card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-sm);
}

@media (max-width: 640px) {
  .app-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 641px) and (max-width: 800px) {
  .app-card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
