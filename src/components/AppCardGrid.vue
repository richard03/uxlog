<template>
  <nav class="app-card-grid" :class="{ 'app-card-grid--fixed': columns }" :style="columns ? { '--card-grid-columns': columns } : null" :aria-label="ariaLabel">
    <slot />
  </nav>
</template>

<script setup>
/**
 * Mřížka pro kartičky – 5 sloupců na desktopu, 3 na tabletu, 2 na mobilu.
 * Vhodná pro CounterCard i jiné typy karet.
 * @param {string} ariaLabel - aria-label pro přístupnost navigace
 * @param {number} columns - pevný počet sloupců (např. v úzkém sloupci layoutu); 0 = výchozí responzivní mřížka
 */
defineProps({
  ariaLabel: { type: String, default: '' },
  columns: { type: Number, default: 0 },
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

/* Pevný počet sloupců – má přednost před responzivními breakpointy */
.app-card-grid.app-card-grid--fixed {
  grid-template-columns: repeat(var(--card-grid-columns), minmax(0, 1fr));
}
</style>
