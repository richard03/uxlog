<template>
  <Modal :title="t.settings.title" @close="emit('close')">
    <form @submit.prevent="save">
      <p class="hint">{{ t.settings.hint }}</p>
      <div v-for="service in AI_SERVICES" :key="service.id" class="field">
        <label :for="'ai-key-' + service.id" class="label">{{ service.name }}</label>
        <div class="input-row">
          <input
            :id="'ai-key-' + service.id"
            v-model="keys[service.id]"
            :type="visible[service.id] ? 'text' : 'password'"
            :placeholder="service.placeholder"
            class="input"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="button"
            class="btn btn-ghost icon-btn"
            :aria-label="visible[service.id] ? t.settings.hideKey : t.settings.showKey"
            @click="visible[service.id] = !visible[service.id]"
          >
            {{ visible[service.id] ? '🙈' : '👁' }}
          </button>
        </div>
        <p class="field-hint">{{ service.hint }}</p>
      </div>
      <div class="actions">
        <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        <button type="button" class="btn btn-ghost" @click="emit('close')">{{ t.common.cancel }}</button>
      </div>
      <p v-if="saved" class="saved-msg" role="status">{{ t.settings.saved }}</p>
    </form>
  </Modal>
</template>

<script setup>
import { reactive, ref } from 'vue'
import Modal from './Modal.vue'
import { useI18n } from '../composables/useI18n.js'
import { AI_SERVICES, loadAiKeys, saveAiKeys } from '../lib/aiKeys.js'

const emit = defineEmits(['close'])
const { t } = useI18n()

const loaded = loadAiKeys()
const keys = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, loaded[s.id] ?? '']))
)
const visible = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, false]))
)
const saved = ref(false)

function save() {
  saveAiKeys({ ...keys })
  saved.value = true
  setTimeout(() => {
    saved.value = false
    emit('close')
  }, 1000)
}
</script>

<style scoped>
.hint {
  margin: 0 0 var(--space-md);
  color: var(--text-muted);
  font-size: 0.9rem;
}

.field {
  margin-bottom: var(--space-md);
}

.label {
  display: block;
  font-weight: 500;
  margin-bottom: var(--space-xs);
}

.input-row {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.input {
  flex: 1;
  min-width: 0;
}

.field-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.saved-msg {
  margin: var(--space-sm) 0 0;
  color: var(--success, green);
  font-size: 0.9rem;
}

.icon-btn {
  padding: var(--space-xs) var(--space-sm);
  font-size: 1rem;
}
</style>
