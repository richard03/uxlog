<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.config.apiKeys }}</h1>
      <p class="page-hint">{{ t.settings.hint }}</p>
    </header>

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
          :field="keyField"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField(service.id, 'key', val)"
        />
        <InlineEditableDetailField
          :label="t.settings.modelLabel"
          :display-value="models[service.id] || service.modelPlaceholder"
          :raw-value="models[service.id]"
          :empty="!models[service.id]"
          :field="modelField"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField(service.id, 'model', val)"
        />
      </dl>
      <p class="service-hint">{{ service.hint }}</p>
    </SectionCard>
  </div>
</template>

<script setup>
/**
 * Stránka nastavení konektorů (API klíčů) pro AI služby v sekci Konfigurace.
 * Každá služba má vlastní kartu s inline editovatelnými poli.
 */
import { reactive, computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { AI_SERVICES, loadAiKeys, saveAiKeys } from '../lib/aiKeys.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import SectionCard from '../components/SectionCard.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'

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

const keyField = { key: 'key', type: 'text' }
const modelField = { key: 'model', type: 'text' }

/** Zobrazí zamaskovanou hodnotu klíče, nebo '—' pokud není nastaven. */
function maskedKey(serviceId) {
  const val = keys[serviceId]
  if (!val) return ''
  const visible = val.slice(0, 4)
  return visible + '●'.repeat(Math.min(val.length - 4, 8))
}

function saveField(serviceId, fieldKey, value) {
  if (fieldKey === 'key') {
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

.service-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
