<template>
  <template v-if="available">
    <SectionCard :title="t.vault.title" :aria-label="t.vault.title">
      <FormCheckbox
        control-id="vault-enabled"
        :model-value="settings.enabled"
        :label="t.vault.enabled"
        @update:model-value="setEnabled"
      />
      <dl class="detail-list">
        <div class="detail-item">
          <dt>{{ t.vault.folder }}</dt>
          <dd :class="{ 'value-empty': !settings.root }" class="vault-path">{{ settings.root || t.vault.folderNotSet }}</dd>
        </div>
      </dl>
      <div class="card-actions">
        <AppButton variant="secondary" size="sm" @click="chooseFolder">{{ t.vault.chooseFolder }}</AppButton>
        <AppButton variant="tertiary" size="sm" @click="useDefaultFolder">{{ t.vault.defaultFolder }}</AppButton>
        <AppButton v-if="settings.root" variant="tertiary" size="sm" @click="openFolder">{{ t.vault.openFolder }}</AppButton>
      </div>
      <p v-if="status.lastError || actionError" class="vault-error" role="alert">
        {{ t.vault.error }}: {{ status.lastError || actionError }}
      </p>
      <ul v-if="status.errors.length" class="vault-list" :aria-label="t.vault.fileErrors">
        <li v-for="e in status.errors" :key="e.root + e.path"><code>{{ e.path }}</code> – {{ e.message }}</li>
      </ul>
      <template v-if="settings.enabled && projectFolders.length">
        <h3 class="vault-subtitle">{{ t.vault.projectFoldersTitle }}</h3>
        <ul class="vault-list">
          <li v-for="p in projectFolders" :key="p.id">
            <router-link :to="{ name: 'project', params: { id: p.id } }">{{ p.name }}</router-link>
            – <span class="vault-path">{{ p.folder }}</span>
            <span v-if="p.issue" class="vault-error" role="alert"> {{ p.issue }}</span>
          </li>
        </ul>
      </template>
      <p v-if="settings.enabled && orphanCount" class="service-hint">{{ t.vault.orphans(orphanCount) }}</p>
      <p class="service-hint">{{ t.vault.hint }}</p>
      <p class="service-hint">{{ t.vault.folderHint }}</p>
      <p v-if="settings.enabled" class="service-hint">{{ t.vault.projectFoldersHint }}</p>
    </SectionCard>

    <SectionCard v-if="settings.enabled && status.massChange" :title="t.vault.massChangeTitle" :aria-label="t.vault.massChangeTitle">
      <p class="service-hint" role="alert">{{ t.vault.massChangeHint }}</p>
      <div class="card-actions">
        <AppButton variant="primary" size="sm" @click="openReview">{{ t.vault.reviewChanges }}</AppButton>
      </div>
    </SectionCard>

    <SectionCard v-if="settings.enabled && pendingConflictCount" :title="t.vault.conflictsTitle(pendingConflictCount)" :aria-label="t.vault.conflictsTitle(pendingConflictCount)">
      <p class="service-hint">{{ t.vault.conflictsHint }}</p>
      <ul class="vault-list">
        <li v-for="c in status.pendingConflicts" :key="c.id"><strong>{{ c.label }}</strong> – <code>{{ fileLabel(c) }}</code></li>
      </ul>
      <div class="card-actions">
        <AppButton variant="primary" size="sm" @click="openConflicts">{{ t.vault.resolveConflicts }}</AppButton>
      </div>
    </SectionCard>

    <SectionCard v-if="settings.enabled && status.invalidFiles.length" :title="t.vault.invalidTitle(status.invalidFiles.length)" :aria-label="t.vault.invalidTitle(status.invalidFiles.length)">
      <p class="service-hint">{{ t.vault.invalidHint }}</p>
      <ul class="vault-list">
        <li v-for="f in status.invalidFiles" :key="f.root + f.path">
          <code>{{ fileLabel(f) }}</code>
          <ul><li v-for="(issue, i) in f.issues" :key="i">{{ issueText(issue) }}</li></ul>
        </li>
      </ul>
    </SectionCard>

    <SectionCard v-if="settings.enabled && conflictCount" :title="t.vault.changesTitle(conflictCount)" :aria-label="t.vault.changesTitle(conflictCount)">
      <p class="service-hint">{{ t.vault.changesHint }}</p>
      <div v-if="dataChangeCount" class="card-actions">
        <AppButton variant="primary" size="sm" :disabled="status.running" @click="openReview">{{ t.vault.reviewChanges }}</AppButton>
      </div>
      <ul class="vault-list">
        <li v-for="c in status.conflicts" :key="c.root + c.path" class="vault-conflict">
          <span><code>{{ fileLabel(c) }}</code> – {{ t.vault.conflictReason[c.reason] ?? c.reason }}</span>
          <AppButton
            v-if="c.reason !== 'newFile'"
            variant="dangerTertiary"
            size="sm"
            :aria-label="t.vault.overwriteAria(fileLabel(c))"
            @click="askOverwrite([c])"
          >
            {{ t.vault.overwrite }}
          </AppButton>
        </li>
      </ul>
      <div v-if="overwritable.length" class="card-actions">
        <AppButton variant="danger" size="sm" @click="askOverwrite(overwritable)">
          {{ t.vault.overwriteAll }}
        </AppButton>
      </div>
    </SectionCard>

    <VaultImportModal v-if="review.open" />

    <ConfirmDialog
      v-if="pendingOverwrite"
      :title="t.vault.overwriteConfirmTitle"
      :message="t.vault.overwriteConfirm(pendingOverwrite.length)"
      :confirm-label="t.vault.overwrite"
      @confirm="confirmOverwrite"
      @cancel="pendingOverwrite = null"
    />
  </template>
</template>

<script setup>
/**
 * Konektor Složka dat (na obrazovce Konektory, jen desktop) – zápis dat aplikace do složky souborů
 * .md/.yaml pro Claude Code. Zápis i načítání změn běží samy; karty pod nastavením se ukážou
 * jen při problému (konflikty, soubory s chybou, nezvykle velká změna, změny v souborech).
 */
import { computed, ref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useVaultSettings } from '../composables/useVaultSettings.js'
import SectionCard from './SectionCard.vue'
import AppButton from './AppButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import VaultImportModal from './VaultImportModal.vue'
import { FormCheckbox } from './form'

const { t } = useI18n()
const {
  available, settings, status, conflictCount, dataChangeCount, pendingConflictCount, actionError, review,
  setEnabled, chooseFolder, useDefaultFolder, overwriteConflicts, openFolder, openReview, openConflicts, issueText,
  fileLabel, projectFolders,
} = useVaultSettings()

/** Soubory, které lze přepsat verzí z aplikace (nové soubory aplikace nezná – ty jen načíst). */
const overwritable = computed(() => status.value.conflicts.filter((c) => c.reason !== 'newFile'))

const orphanCount = computed(() =>
  status.value.warnings.filter((w) => w.code === 'orphanEntities').reduce((sum, w) => sum + (w.count ?? 0), 0),
)

/** Soubory ({ root, path }) čekající na potvrzení přepsání. */
const pendingOverwrite = ref(null)

function askOverwrite(items) {
  if (items.length) pendingOverwrite.value = items
}

async function confirmOverwrite() {
  const items = pendingOverwrite.value
  pendingOverwrite.value = null
  await overwriteConflicts(items)
}
</script>

<style scoped>
.detail-list { margin: var(--space-sm) 0; }
.detail-item dt { font-size: 0.8rem; color: var(--text-muted); }
.detail-item dd { margin: 0; }
.vault-path { font-family: var(--font-mono); word-break: break-all; }
.value-empty { color: var(--text-muted); }
.card-actions { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-sm); }
.service-hint { margin: var(--space-sm) 0 0; color: var(--text-muted); font-size: 0.85rem; }
.vault-error { margin: var(--space-sm) 0 0; color: var(--error); }
.vault-list { margin: var(--space-sm) 0 0; padding-left: var(--space-md); font-size: 0.85rem; }
.vault-list code { word-break: break-all; }
.vault-subtitle { margin: var(--space-md) 0 0; font-size: 0.9rem; font-weight: 600; }
.vault-conflict { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); padding: 2px 0; }
</style>
