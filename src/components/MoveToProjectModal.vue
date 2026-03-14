<template>
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @keydown.esc="$emit('close')"
  >
    <div class="modal" ref="modalRef">
      <header class="modal-header">
        <h2 :id="titleId">{{ t.common.moveToProject }}</h2>
      </header>
      <div class="modal-body">
        <p v-if="otherProjects.length === 0" class="no-projects">{{ t.common.moveNoOtherProjects }}</p>
        <template v-else>
          <FormSelect
            v-model="selectedProjectId"
            :label="t.common.moveSelectProject"
            control-id="move-project-select"
            :options="otherProjects.map((p) => ({ value: p.id, label: p.name }))"
          />
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">{{ t.common.cancel }}</button>
            <button type="button" class="btn btn-primary" :disabled="!selectedProjectId" @click="doMove">{{ t.common.moveConfirm }}</button>
          </div>
        </template>
        <div v-if="otherProjects.length === 0" class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">{{ t.common.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { FormSelect } from './form'

const props = defineProps({
  stateKey: { type: String, required: true },
  entityId: { type: String, required: true },
  currentProjectId: { type: String, required: true },
})

const emit = defineEmits(['close', 'moved'])

const store = useStore()
const { t } = useI18n()
const modalRef = ref(null)
const titleId = 'move-title-' + Math.random().toString(36).slice(2)

const otherProjects = computed(() =>
  store.getProjects().filter((p) => p.id !== props.currentProjectId)
)

const selectedProjectId = ref(otherProjects.value[0]?.id ?? null)

function doMove() {
  if (!selectedProjectId.value) return
  store.moveEntityToProject(props.stateKey, props.entityId, selectedProjectId.value)
  emit('moved', selectedProjectId.value)
}

function handleClick(e) {
  if (modalRef.value && !modalRef.value.contains(e.target)) {
    emit('close')
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
  width: 100%;
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
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.no-projects {
  color: var(--text-muted);
  margin: 0;
}
</style>
