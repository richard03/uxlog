<template>
  <div v-if="message" class="error-banner" role="alert">
    <span>{{ message }}</span>
    <button @click="$emit('dismiss')" aria-label="Dismiss">✕</button>
  </div>
</template>

<script setup>
defineProps({ message: String })
defineEmits(['dismiss'])
</script>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  gap: 0.5rem;
}
button {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
}
</style>
