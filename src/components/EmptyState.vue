<template>
  <div class="empty-state">
    <slot />
  </div>
</template>

<script setup>
/**
 * EmptyState – zobrazení prázdného stavu se sjednoceným stylem.
 * Používá se pro prázdné seznamy, bez výsledků vyhledávání atd.
 */
</script>

<script>
export default {
  name: 'EmptyState',
}
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
}

.empty-state :deep(p) {
  margin-bottom: var(--space-md);
}
</style>
