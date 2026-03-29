<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.config.apiKeys }}</h1>
      <p class="page-hint">{{ t.settings.hint }}</p>
    </header>

    <!-- Pluginy -->
    <SectionCard :title="t.plugins.title" :aria-label="t.plugins.title">
      <p class="service-hint">{{ t.plugins.hint }}</p>
      <div class="plugin-list">
        <div v-for="def in pluginDefs" :key="def.id" class="plugin-row">
          <div class="plugin-info">
            <strong>{{ def.name }}</strong>
            <span class="plugin-status" :class="isActive(def.id) ? 'status-on' : 'status-off'">
              {{ isActive(def.id) ? t.plugins.enabled : t.plugins.disabled }}
            </span>
          </div>
          <AppButton
            :variant="isActive(def.id) ? 'danger' : 'primary'"
            size="sm"
            :aria-label="isActive(def.id) ? t.plugins.disableAria(def.name) : t.plugins.enableAria(def.name)"
            @click="togglePlugin(def.id)"
          >
            {{ isActive(def.id) ? t.plugins.disable : t.plugins.enable }}
          </AppButton>
        </div>
      </div>
      <p v-if="pluginChanged" class="reload-hint" role="status">{{ t.plugins.reloadNeeded }}</p>
    </SectionCard>

    <!-- Flexi API konektor (jen pokud je plugin aktivní) -->
    <SectionCard v-if="isActive('flexi-api')" :title="t.settings.flexi.name" :aria-label="t.settings.flexi.name">
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

    <!-- AI služby – každá podmíněná svým pluginem -->
    <SectionCard
      v-for="service in aiServices"
      v-show="isActive(service.pluginId)"
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
import { useStore } from '../composables/useStore.js'
import { usePlugin } from '../composables/usePlugin.js'
import { usePluginAdmin } from '../composables/usePluginAdmin.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import SectionCard from '../components/SectionCard.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import Modal from '../components/Modal.vue'
import AppButton from '../components/AppButton.vue'

const { t } = useI18n()
const { state, getData, persist: persistStore } = useStore()
const { allPluginDefs, isPluginActive, enablePlugin, disablePlugin } = usePlugin()
const {
  loadAiKeys, saveAiKeys, isAiServiceEnabled, setAiServiceEnabled,
  GEMINI_SERVICE, OPENAI_SERVICE,
  loadFlexiConfig, saveFlexiConfig, initFlexiSync, setFlexiSnapshot,
} = usePluginAdmin()

// --- Pluginy ---
const pluginDefs = computed(() => allPluginDefs.value.filter((p) => !p.core))
const pluginChanged = ref(false)

function isActive(id) {
  return isPluginActive(id)
}

function togglePlugin(id) {
  if (isPluginActive(id)) {
    disablePlugin(id)
  } else {
    enablePlugin(id)
  }
  pluginChanged.value = true
}

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
  flexi.syncEnabled = false
  saveFlexiConfig({ url: flexi.url, apiKey: flexi.apiKey, syncEnabled: false })
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
    persistStore()
  })
}

// --- AI služby ---

/** Seznam AI služeb s mapováním na plugin id */
const aiServices = [
  { ...GEMINI_SERVICE, pluginId: 'ai-gemini' },
  { ...OPENAI_SERVICE, pluginId: 'ai-openai' },
]

const loadedAi = loadAiKeys()
const keys = reactive(
  Object.fromEntries(aiServices.map((s) => [s.id, loadedAi[s.id] ?? '']))
)
const models = reactive(
  Object.fromEntries(aiServices.map((s) => [s.id, loadedAi[`${s.id}_model`] ?? '']))
)
const enabled = reactive(
  Object.fromEntries(aiServices.map((s) => [s.id, isAiServiceEnabled(s.id)]))
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
  for (const s of aiServices) {
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

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border);
}

.plugin-row:last-child {
  border-bottom: none;
}

.plugin-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.plugin-status {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-on {
  color: var(--success, #16a34a);
  background: var(--success-bg, rgba(22, 163, 74, 0.1));
}

.status-off {
  color: var(--text-muted);
  background: var(--bg-muted, rgba(128, 128, 128, 0.1));
}

.reload-hint {
  margin-top: var(--space-sm);
  color: var(--warning, #ca8a04);
  font-size: 0.85rem;
  font-weight: 500;
}
</style>
