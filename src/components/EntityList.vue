<template>
  <ul class="entity-list" role="list">
    <slot />
  </ul>
</template>

<script setup>
/**
 * EntityList – vertikální seznam karet entit (projekty, aktivity atd.).
 */
</script>

<script>
export default {
  name: 'EntityList',
}
</script>

<style scoped>
.entity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
