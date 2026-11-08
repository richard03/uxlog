<template>
  <div class="container">
    <ConfigScreenHeader
      :title="isProject ? t.config.projectTitle : t.config.defaultTitle"
      :hint="isProject ? t.config.projectHint : t.config.defaultHint"
      :breadcrumbs="breadcrumbs"
    />

    <AppCardGrid :aria-label="t.config.sectionsLabel">
      <CounterCard
        :to="scope.to('configEntities')"
        :label="t.config.entities"
        :count="entityCount"
        variant="config"
      />
      <CounterCard
        :to="scope.to('configActivities')"
        :label="t.config.activities"
        :count="activityCount"
        variant="config"
      />
      <!-- Konektory jsou společné pro všechny projekty – jen ve výchozí konfiguraci -->
      <CounterCard
        v-if="!isProject"
        :to="{ name: 'configApiKeys' }"
        :label="t.config.apiKeys"
        :count="apiKeyCount"
        variant="config"
      />
    </AppCardGrid>

    <!-- Složka dat projektu (jen desktop se zapnutou Složkou dat) -->
    <SectionCard
      v-if="isProject && vaultFolder.available.value"
      class="project-vault"
      :title="t.vault.projectFolderTitle"
      :aria-label="t.vault.projectFolderTitle"
    >
      <p class="project-vault-path">{{ vaultFolder.summary.value }}</p>
      <p v-if="vaultFolder.issue.value || vaultFolder.openError.value" class="project-vault-error" role="alert">
        {{ vaultFolder.issue.value || vaultFolder.openError.value }}
      </p>
      <div class="project-vault-actions">
        <AppButton variant="secondary" size="sm" @click="showVaultFolder = true">{{ t.vault.projectFolderChange }}</AppButton>
        <AppButton v-if="vaultFolder.currentPath.value" variant="tertiary" size="sm" @click="vaultFolder.openFolder">{{ t.vault.openFolder }}</AppButton>
      </div>
      <p class="project-vault-hint">{{ t.vault.projectFolderHint }}</p>
    </SectionCard>
    <ProjectVaultFolderModal v-if="showVaultFolder" :project-id="scope.projectId.value" @close="showVaultFolder = false" />
  </div>
</template>

<script setup>
/**
 * Přehled konfigurace pro oba rozsahy:
 * - výchozí konfigurace (/config) – vzor pro nové projekty, plus Konektory společné pro všechny projekty,
 * - konfigurace projektu (/project/:id/config) – platí jen pro projekt, plus jeho Složka dat.
 */
import { computed, ref } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { usePluginAdmin } from '../composables/usePluginAdmin.js'
import { useVaultSettings } from '../composables/useVaultSettings.js'
import { useConfigScope } from '../composables/useConfigScope.js'
import { useProjectVaultFolder } from '../composables/useProjectVaultFolder.js'
import ConfigScreenHeader from '../components/ConfigScreenHeader.vue'
import CounterCard from '../components/CounterCard.vue'
import AppCardGrid from '../components/AppCardGrid.vue'
import AppButton from '../components/AppButton.vue'
import SectionCard from '../components/SectionCard.vue'
import ProjectVaultFolderModal from '../components/ProjectVaultFolderModal.vue'

const { t } = useI18n()
const scope = useConfigScope()
const { config, isProject } = scope
const { loadAiKeys, GEMINI_SERVICE, OPENAI_SERVICE, loadFlexiConfig } = usePluginAdmin()
const { settings: vaultSettings } = useVaultSettings()
const vaultFolder = useProjectVaultFolder(() => scope.projectId.value)
const showVaultFolder = ref(false)

const breadcrumbs = computed(() => scope.breadcrumbs())

/** Počet typů entit (goal, stakeholder, …). */
const entityCount = computed(() => Object.keys(config.ENTITY_FIELD_DEFAULTS).length)

/** Počet šablon aktivit v konfiguraci. */
const activityCount = computed(() => config.getEffectiveTemplates().length)

/** Počet nastavených konektorů (Flexi + AI služby s neprázdným klíčem + zapnutá Složka dat). */
const apiKeyCount = computed(() => {
  const flexi = loadFlexiConfig()
  const aiKeys = loadAiKeys()
  const flexiCount = flexi.url ? 1 : 0
  const aiCount = [GEMINI_SERVICE, OPENAI_SERVICE].filter((s) => aiKeys[s.id]).length
  return flexiCount + aiCount + (vaultSettings.value.enabled ? 1 : 0)
})
</script>

<style scoped>
.project-vault { margin-top: var(--space-md); }
.project-vault-path { margin: 0 0 var(--space-sm); font-family: var(--font-mono); font-size: 0.9rem; word-break: break-all; }
.project-vault-error { margin: 0 0 var(--space-sm); color: var(--error); font-size: 0.85rem; }
.project-vault-actions { display: flex; flex-wrap: wrap; gap: var(--space-md); }
.project-vault-hint { margin: var(--space-sm) 0 0; color: var(--text-muted); font-size: 0.85rem; }
</style>
