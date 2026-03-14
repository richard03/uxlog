<template>
  <header class="page-header">
    <slot />
  </header>
</template>

<script setup>
/**
 * PageHeader – záhlaví stránky s flex layoutem.
 */
</script>

<script>
export default {
  name: 'PageHeader',
}
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
</style>
