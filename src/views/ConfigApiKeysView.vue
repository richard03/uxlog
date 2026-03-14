<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.settings.title }}</h1>
      <p class="page-hint">{{ t.settings.hint }}</p>
    </header>

    <section class="config-section" aria-labelledby="api-keys-heading">
      <h2 id="api-keys-heading">{{ t.settings.title }}</h2>
      <form @submit.prevent="save">
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
            <AppButton
              variant="tertiary"
              icon-only
              :aria-label="visible[service.id] ? t.settings.hideKey : t.settings.showKey"
              @click="visible[service.id] = !visible[service.id]"
            >
              {{ visible[service.id] ? '🙈' : '👁' }}
            </AppButton>
          </div>
          <p class="field-hint">{{ service.hint }}</p>
          <div class="model-row">
            <label :for="'ai-model-' + service.id" class="model-label">{{ t.settings.modelLabel }}</label>
            <input
              :id="'ai-model-' + service.id"
              v-model="models[service.id]"
              type="text"
              :placeholder="service.modelPlaceholder"
              class="input input-sm"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <p class="field-hint">{{ t.settings.modelHint }}</p>
        </div>
        <div class="actions">
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </div>
        <p v-if="saved" class="saved-msg" role="status">{{ t.settings.saved }}</p>
      </form>
    </section>
  </div>
</template>

<script setup>
/**
 * Stránka nastavení API klíčů pro AI služby v sekci Konfigurace.
 */
import { reactive, ref, computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { AI_SERVICES, loadAiKeys, saveAiKeys } from '../lib/aiKeys.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import AppButton from '../components/AppButton.vue'

const { t } = useI18n()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.apiKeys },
])

const loaded = loadAiKeys()
const keys = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, loaded[s.id] ?? '']))
)
const models = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, loaded[`${s.id}_model`] ?? '']))
)
const visible = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, false]))
)
const saved = ref(false)

function save() {
  const data = { ...keys }
  for (const s of AI_SERVICES) {
    data[`${s.id}_model`] = models[s.id]
  }
  saveAiKeys(data)
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}
</script>

<style scoped>
.page-hint {
  margin: var(--space-xs) 0 var(--space-md);
  color: var(--text-muted);
  font-size: 0.95rem;
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

.model-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.model-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.input-sm {
  font-size: 0.85rem;
  padding: 0.2rem 0.5rem;
}
</style>
