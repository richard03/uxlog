<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.config.apiKeys }}</h1>
      <p class="page-hint">{{ t.settings.hint }}</p>
    </header>

    <!-- Flexi API konektor -->
    <SectionCard :title="t.settings.flexi.name" :aria-label="t.settings.flexi.name">
      <dl class="detail-list">
        <div class="detail-item">
          <dt>{{ t.settings.flexi.urlLabel }}</dt>
          <dd :class="{ 'value-empty': !flexi.url }">{{ flexi.url || '—' }}</dd>
        </div>
        <div class="detail-item">
          <dt>{{ t.settings.flexi.apiKeyLabel }}</dt>
          <dd :class="{ 'value-empty': !flexi.apiKey }">{{ maskedFlexiKey || '—' }}</dd>
        </div>
      </dl>
      <div class="card-actions">
        <AppButton variant="secondary" size="sm" @click="openFlexiModal">
          {{ t.common.edit }}
        </AppButton>
        <AppButton
          v-if="flexi.url"
          :variant="flexi.syncEnabled ? 'danger' : 'primary'"
          size="sm"
          :aria-label="flexi.syncEnabled ? t.settings.flexi.syncEnabledAria : t.settings.flexi.syncDisabledAria"
          @click="toggleSync"
        >
          {{ flexi.syncEnabled ? t.settings.flexi.disableSync : t.settings.flexi.enableSync }}
        </AppButton>
      </div>
      <p class="service-hint">{{ t.settings.flexi.hint }}</p>
    </SectionCard>

    <!-- AI služby -->
    <SectionCard
      v-for="service in AI_SERVICES"
      :key="service.id"
      :title="service.name"
      :aria-label="service.name"
    >
      <dl class="detail-list">
        <InlineEditableDetailField
          :label="t.settings.keyLabel"
          :display-value="maskedKey(service.id)"
          :raw-value="keys[service.id]"
          :empty="!keys[service.id]"
          :field="{ key: 'key', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveAiField(service.id, 'key', val)"
        />
        <InlineEditableDetailField
          :label="t.settings.modelLabel"
          :display-value="models[service.id] || service.modelPlaceholder"
          :raw-value="models[service.id]"
          :empty="!models[service.id]"
          :field="{ key: 'model', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveAiField(service.id, 'model', val)"
        />
      </dl>
      <div v-if="keys[service.id]" class="card-actions">
        <AppButton
          :variant="enabled[service.id] ? 'danger' : 'primary'"
          size="sm"
          :aria-label="enabled[service.id] ? t.settings.serviceEnabledAria(service.name) : t.settings.serviceDisabledAria(service.name)"
          @click="toggleAiService(service.id)"
        >
          {{ enabled[service.id] ? t.settings.disableService : t.settings.enableService }}
        </AppButton>
      </div>
      <p class="service-hint">{{ service.hint }}</p>
    </SectionCard>
  </div>

  <!-- Modal pro Flexi API -->
  <Modal
    v-if="showFlexiModal"
    :title="t.settings.flexi.name"
    @close="closeFlexiModal"
  >
    <form @submit.prevent="saveFlexiModal">
      <div class="form-group">
        <label for="flexi-url" class="form-group-label">{{ t.settings.flexi.urlLabel }}</label>
        <input
          id="flexi-url"
          v-model="draft.url"
          type="url"
          class="form-control"
          :placeholder="t.settings.flexi.urlPlaceholder"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="field-hint">{{ t.settings.flexi.urlHint }}</p>
      </div>
      <div class="form-group">
        <label for="flexi-key" class="form-group-label">{{ t.settings.flexi.apiKeyLabel }}</label>
        <input
          id="flexi-key"
          v-model="draft.apiKey"
          type="text"
          class="form-control"
          :placeholder="t.settings.flexi.apiKeyPlaceholder"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="field-hint">{{ t.settings.flexi.apiKeyHint }}</p>
      </div>
      <div class="form-actions">
        <AppButton variant="secondary" @click="closeFlexiModal">{{ t.common.cancel }}</AppButton>
        <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
      </div>
    </form>
  </Modal>
</template>

<script setup>
/**
 * Stránka nastavení konektorů – Flexi API + AI služby.
 * Flexi API se konfiguruje v modálu (URL + klíč atomicky), AI služby inline.
 */
import { reactive, ref, computed } from 'vue'
import { toRaw } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { AI_SERVICES, loadAiKeys, saveAiKeys, isAiServiceEnabled, setAiServiceEnabled } from '../lib/aiKeys.js'
import { loadFlexiConfig, saveFlexiConfig } from '../lib/flexiApi.js'
import { initFlexiSync, setFlexiSnapshot } from '../lib/flexiSync.js'
import { state, getData, persist } from '../lib/stores/index.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import SectionCard from '../components/SectionCard.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import Modal from '../components/Modal.vue'
import AppButton from '../components/AppButton.vue'

const { t } = useI18n()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.apiKeys },
])

// --- Flexi API ---

const loadedFlexi = loadFlexiConfig()
const flexi = reactive({ url: loadedFlexi.url ?? '', apiKey: loadedFlexi.apiKey ?? '', syncEnabled: loadedFlexi.syncEnabled !== false })

const maskedFlexiKey = computed(() => {
  const v = flexi.apiKey
  if (!v) return ''
  return v.slice(0, 4) + '●'.repeat(Math.min(v.length - 4, 8))
})

const showFlexiModal = ref(false)
const draft = reactive({ url: '', apiKey: '' })

function openFlexiModal() {
  draft.url = flexi.url
  draft.apiKey = flexi.apiKey
  showFlexiModal.value = true
}

function closeFlexiModal() {
  showFlexiModal.value = false
}

async function saveFlexiModal() {
  flexi.url = draft.url.trim()
  flexi.apiKey = draft.apiKey.trim()
  saveFlexiConfig({ url: flexi.url, apiKey: flexi.apiKey, syncEnabled: flexi.syncEnabled })
  showFlexiModal.value = false

}

async function toggleSync() {
  flexi.syncEnabled = !flexi.syncEnabled
  saveFlexiConfig({ url: flexi.url, apiKey: flexi.apiKey, syncEnabled: flexi.syncEnabled })
  if (flexi.syncEnabled) {
    await runSync()
  }
}

async function runSync() {
  // Resetujeme snapshot na prázdno – initFlexiSync ho nastaví správně po sloučení
  setFlexiSnapshot({})
  await initFlexiSync(toRaw(getData()), (updates) => {
    Object.assign(state, updates)
    persist()
  })
}

// --- AI služby ---

const loadedAi = loadAiKeys()
const keys = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, loadedAi[s.id] ?? '']))
)
const models = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, loadedAi[`${s.id}_model`] ?? '']))
)
const enabled = reactive(
  Object.fromEntries(AI_SERVICES.map((s) => [s.id, isAiServiceEnabled(s.id)]))
)

function maskedKey(serviceId) {
  const v = keys[serviceId]
  if (!v) return ''
  return v.slice(0, 4) + '●'.repeat(Math.min(v.length - 4, 8))
}

function toggleAiService(serviceId) {
  enabled[serviceId] = !enabled[serviceId]
  setAiServiceEnabled(serviceId, enabled[serviceId])
}

function saveAiField(serviceId, field, value) {
  if (field === 'key') {
    keys[serviceId] = value
  } else {
    models[serviceId] = value
  }
  const data = {}
  for (const s of AI_SERVICES) {
    data[s.id] = keys[s.id]
    data[`${s.id}_model`] = models[s.id]
  }
  saveAiKeys(data)
}
</script>

<style scoped>
.page-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.detail-list {
  margin: 0;
  padding: 0;
}

.detail-item {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 0 var(--space-sm);
  border-bottom: 1px solid var(--border);
  padding: var(--space-xs) 0;
}

.detail-item:last-child {
  border-bottom: none;
}

dt {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

dd {
  margin: 0;
  font-size: 0.95rem;
  word-break: break-all;
}

.value-empty {
  color: var(--text-muted);
  font-style: italic;
}

.card-actions {
  margin-top: var(--space-sm);
}

.service-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.form-group {
  margin-bottom: var(--space-md);
}

.field-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs);
  margin-top: var(--space-md);
}
</style>
