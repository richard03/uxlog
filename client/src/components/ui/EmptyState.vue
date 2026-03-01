<template>
  <div class="empty-state">
    <p class="icon">{{ icon }}</p>
    <p class="title">{{ title }}</p>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon:     { type: String, default: '📭' },
  title:    { type: String, required: true },
  subtitle: { type: String },
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}
.icon { font-size: 2.5rem; margin: 0 0 0.5rem; }
.title { font-size: 1.1rem; font-weight: 600; color: #374151; margin: 0 0 0.25rem; }
.subtitle { font-size: 0.9rem; margin: 0 0 1rem; }
</style>
