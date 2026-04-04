<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" role="status" aria-live="polite">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'

const { message, visible } = useToast()
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-lg);
  font-size: 0.875rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 1000;
  pointer-events: none;
  max-width: 90vw;
  text-align: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
