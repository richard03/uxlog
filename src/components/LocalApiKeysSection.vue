<template>
  <SectionCard :title="t.settings.localApi.name" :aria-label="t.settings.localApi.name">
    <p v-if="!desktop" class="service-hint">{{ t.settings.localApi.desktopOnly }}</p>
    <template v-else>
      <p class="service-hint">{{ t.settings.localApi.hint }}</p>
      <p class="api-url">{{ t.settings.localApi.urlLabel }}: <code>{{ apiUrl }}</code></p>

      <!-- Právě vytvořený klíč – zobrazí se jen jednou -->
      <div v-if="createdToken" class="created" role="status">
        <p class="created-title">{{ t.settings.localApi.createdTitle(createdToken.name) }}</p>
        <p class="created-warning">{{ t.settings.localApi.createdWarning }}</p>
        <code class="created-token">{{ createdToken.token }}</code>
        <div class="card-actions">
          <AppButton variant="primary" size="sm" @click="copyCreated">
            {{ copied ? t.settings.localApi.copied : t.settings.localApi.copy }}
          </AppButton>
          <AppButton variant="secondary" size="sm" @click="dismissCreated">{{ t.settings.localApi.done }}</AppButton>
        </div>
      </div>

      <p v-if="!keys.length" class="empty">{{ t.settings.localApi.empty }}</p>
      <ul v-else class="key-list" :aria-label="t.settings.localApi.listLabel">
        <li v-for="key in keys" :key="key.id" class="key-row">
          <div class="key-info">
            <strong>{{ key.name }}</strong>
            <span class="key-meta">
              <code>{{ key.prefix }}…</code>
              · {{ t.settings.localApi.createdAt(formatDate(key.createdAt) || '—') }}
              · {{ usage[key.id] ? t.settings.localApi.lastUsed(formatStatusBarDateTime(new Date(usage[key.id]).toISOString())) : t.settings.localApi.notUsed }}
            </span>
          </div>
          <AppButton
            variant="danger"
            size="sm"
            :aria-label="t.settings.localApi.revokeAria(key.name)"
            @click="pendingRevoke = key"
          >{{ t.settings.localApi.revoke }}</AppButton>
        </li>
      </ul>

      <form class="create-form" @submit.prevent="submitCreate">
        <FormInput
          v-model="newName"
          :label="t.settings.localApi.newNameLabel"
          control-id="local-api-key-name"
          :placeholder="t.settings.localApi.newNamePlaceholder"
          :dictation="false"
        />
        <AppButton variant="primary" native-type="submit" :disabled="busy">{{ t.settings.localApi.create }}</AppButton>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p class="service-hint">{{ t.settings.localApi.pluginHint }}</p>
    </template>

    <ConfirmDialog
      v-if="pendingRevoke"
      :title="t.settings.localApi.revokeTitle"
      :message="t.settings.localApi.revokeConfirm(pendingRevoke.name)"
      :confirm-label="t.settings.localApi.revoke"
      @confirm="confirmRevoke"
      @cancel="pendingRevoke = null"
    />
  </SectionCard>
</template>

<script setup>
/**
 * Karta Lokální API na obrazovce Konektory: adresa API a správa API klíčů pro Figma plugin.
 */
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useLocalApiKeys } from '../composables/useLocalApiKeys.js'
import { formatDate, formatStatusBarDateTime } from '../utils/formatDate.js'
import SectionCard from './SectionCard.vue'
import AppButton from './AppButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { FormInput } from './form'

const { t } = useI18n()
const {
  desktop, apiUrl, keys, usage, createdToken, copied, error, busy,
  createKey, revokeKey, copyCreated, dismissCreated,
} = useLocalApiKeys()

const newName = ref('')
const pendingRevoke = ref(null)

async function submitCreate() {
  await createKey(newName.value)
  if (!error.value) newName.value = ''
}

async function confirmRevoke() {
  const key = pendingRevoke.value
  pendingRevoke.value = null
  if (key) await revokeKey(key.id)
}
</script>

<style scoped>
.api-url {
  margin: var(--space-sm) 0 0;
}

.service-hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.created {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.created-title {
  margin: 0;
  font-weight: 600;
}

.created-warning {
  margin: var(--space-xs) 0 var(--space-sm);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.created-token {
  display: block;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
  user-select: all;
}

.empty {
  margin: var(--space-md) 0 0;
  color: var(--text-muted);
}

.key-list {
  list-style: none;
  margin: var(--space-md) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.key-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border);
}

.key-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.key-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.create-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.create-form > :first-child {
  flex: 1 1 14rem;
  margin-bottom: 0;
}

.error {
  margin: var(--space-sm) 0 0;
  color: var(--error);
  font-size: 0.85rem;
}
</style>
