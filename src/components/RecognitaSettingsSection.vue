<template>
  <SectionCard :title="t.settings.recognita.name" :aria-label="t.settings.recognita.name">
    <p v-if="!desktop" class="service-hint">{{ t.settings.recognita.desktopOnly }}</p>
    <template v-else>
      <dl class="detail-list">
        <InlineEditableDetailField
          :label="t.settings.recognita.urlLabel"
          :display-value="settings.url || t.settings.recognita.urlPlaceholder"
          :raw-value="settings.url"
          :empty="!settings.url"
          :field="{ key: 'url', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('url', val)"
        />
        <InlineEditableDetailField
          :label="t.settings.recognita.apiKeyLabel"
          :display-value="maskedKey || t.settings.recognita.apiKeyPlaceholder"
          :raw-value="settings.apiKey"
          :empty="!settings.apiKey"
          :field="{ key: 'apiKey', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('apiKey', val)"
        />
        <InlineEditableDetailField
          :label="t.settings.recognita.languageLabel"
          :display-value="settings.language || '—'"
          :raw-value="settings.language"
          :empty="!settings.language"
          :field="{ key: 'language', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('language', val)"
        />
        <InlineEditableDetailField
          :label="t.settings.recognita.vocabularyLabel"
          :display-value="settings.vocabulary || '—'"
          :raw-value="settings.vocabulary"
          :empty="!settings.vocabulary"
          :field="{ key: 'vocabulary', type: 'text' }"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @save="(val) => saveField('vocabulary', val)"
        />
      </dl>
      <div v-if="settings.url && settings.apiKey" class="card-actions">
        <AppButton
          variant="secondary"
          size="sm"
          :disabled="testing || !configured"
          @click="testConnection"
        >
          {{ testing ? t.settings.recognita.testing : t.settings.recognita.test }}
        </AppButton>
        <AppButton
          :variant="settings.enabled ? 'danger' : 'primary'"
          size="sm"
          :aria-label="settings.enabled ? t.settings.recognita.enabledAria : t.settings.recognita.disabledAria"
          @click="toggleEnabled"
        >
          {{ settings.enabled ? t.settings.recognita.disable : t.settings.recognita.enable }}
        </AppButton>
      </div>
      <p
        v-if="testResult"
        class="test-result"
        :class="testResult.ok ? 'test-result--ok' : 'test-result--error'"
        role="status"
      >{{ testResult.text }}</p>
      <p class="service-hint">{{ t.settings.recognita.hint }}</p>
      <p class="service-hint">{{ t.settings.recognita.urlHint }} {{ t.settings.recognita.languageHint }} {{ t.settings.recognita.vocabularyHint }}</p>
    </template>
  </SectionCard>
</template>

<script setup>
/**
 * Karta konektoru Recognita (diktování) na obrazovce Konektory.
 */
import { useI18n } from '../composables/useI18n.js'
import { useRecognitaSettings } from '../composables/useRecognitaSettings.js'
import SectionCard from './SectionCard.vue'
import InlineEditableDetailField from './InlineEditableDetailField.vue'
import AppButton from './AppButton.vue'

const { t } = useI18n()
const {
  settings, configured, maskedKey, desktop,
  testResult, testing, saveField, toggleEnabled, testConnection,
} = useRecognitaSettings()
</script>

<style scoped>
.detail-list {
  margin: 0;
  padding: 0;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.service-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.test-result {
  margin: var(--space-sm) 0 0;
  font-size: 0.85rem;
  font-weight: 500;
}

.test-result--ok {
  color: var(--success);
}

.test-result--error {
  color: var(--error);
}
</style>
