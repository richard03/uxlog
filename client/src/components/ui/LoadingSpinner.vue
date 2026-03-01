<template>
  <div class="spinner" :class="{ inline }">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  </div>
</template>

<script setup>
defineProps({ inline: Boolean })
</script>

<style scoped>
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.spinner.inline {
  display: inline-flex;
  padding: 0;
}
svg {
  width: 2rem;
  height: 2rem;
  animation: spin 0.8s linear infinite;
  color: var(--color-primary, #4f46e5);
}
.inline svg { width: 1rem; height: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
