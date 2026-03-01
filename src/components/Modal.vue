<template>
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @keydown.esc="emit('close')"
  >
    <div class="modal" ref="modalRef">
      <header class="modal-header">
        <h2 :id="titleId">{{ title }}</h2>
        <button
          type="button"
          class="btn btn-ghost icon-btn"
          aria-label="Zavřít"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const modalRef = ref(null)
const titleId = 'modal-title-' + Math.random().toString(36).slice(2)

/**
 * Zachytí kliknutí mimo modal.
 */
function handleClick(e) {
  if (modalRef.value && !modalRef.value.contains(e.target)) {
    emit('close')
  }
}

let timeoutId

onMounted(() => {
  document.body.style.overflow = 'hidden'
  // Zpoždění přidání listeneru, aby se nezachytil stejný klik, který modal otevřel
  timeoutId = setTimeout(() => {
    document.addEventListener('click', handleClick)
  }, 0)
})

onUnmounted(() => {
  clearTimeout(timeoutId)
  document.removeEventListener('click', handleClick)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-xl);
  z-index: 1000;
  overflow-y: auto;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 320px;
  max-width: 500px;
  margin: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
}

.modal-body {
  padding: var(--space-md);
}

.icon-btn {
  padding: var(--space-sm);
  font-size: 1.5rem;
  line-height: 1;
}
</style>
