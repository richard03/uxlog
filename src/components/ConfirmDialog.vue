<template>
  <div
    class="modal-overlay"
    role="alertdialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @keydown.esc="cancel"
  >
    <div class="modal" ref="modalRef">
      <header class="modal-header">
        <h2 :id="titleId">{{ title }}</h2>
      </header>
      <div class="modal-body">
        <p>{{ message }}</p>
        <div class="modal-actions">
          <AppButton variant="secondary" @click="cancel">
            {{ t.common.cancel }}
          </AppButton>
          <AppButton variant="danger" @click="confirm">
            {{ t.common.delete }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import AppButton from './AppButton.vue'

const props = defineProps({
  title: { type: String, default: '' },
  message: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const { t } = useI18n()
const modalRef = ref(null)
const titleId = 'confirm-title-' + Math.random().toString(36).slice(2)

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}

function handleClick(e) {
  if (modalRef.value && !modalRef.value.contains(e.target)) {
    cancel()
  }
}

let timeoutId

onMounted(() => {
  document.body.style.overflow = 'hidden'
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
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  z-index: 1000;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 320px;
  max-width: 400px;
}

.modal-header {
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

.modal-body p {
  margin-bottom: var(--space-md);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}
</style>
