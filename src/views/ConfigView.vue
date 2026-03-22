<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.config.title }}</h1>
    </header>

    <AppCardGrid aria-label="Sekce konfigurace">
      <CounterCard
        :to="{ name: 'configEntities' }"
        :label="t.config.entities"
        :count="entityCount"
        variant="config"
      />
      <CounterCard
        :to="{ name: 'configActivities' }"
        :label="t.config.activities"
        :count="activityCount"
        variant="config"
      />
      <CounterCard
        :to="{ name: 'configDeadlines' }"
        :label="t.config.deadlines"
        count="📅"
        variant="config"
        count-as-icon
      />
      <CounterCard
        :to="{ name: 'configApiKeys' }"
        :label="t.config.apiKeys"
        :count="apiKeyCount"
        variant="config"
      />
    </AppCardGrid>
  </div>
</template>

<script setup>
/**
 * Přehled konfigurace – dva boxy pro Entity a Aktivity.
 * Po prokliknutí se zobrazí seznam entit resp. aktivit.
 */
import { computed } from 'vue'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import { ENTITY_FIELD_DEFAULTS } from '../lib/entityFieldDefaults.js'
import { loadAiKeys } from '../lib/plugins/ai-shared/keys.js'
import { SERVICE_DEF as GEMINI_SERVICE } from '../lib/plugins/gemini/index.js'
import { SERVICE_DEF as OPENAI_SERVICE } from '../lib/plugins/openai/index.js'
import { loadFlexiConfig } from '../lib/plugins/flexi/flexiApi.js'
import CounterCard from '../components/CounterCard.vue'
import AppCardGrid from '../components/AppCardGrid.vue'

const config = useConfig()
const { t } = useI18n()

/** Počet typů entit (goal, stakeholder, …). */
const entityCount = computed(() => Object.keys(ENTITY_FIELD_DEFAULTS).length)

/** Počet definovaných šablon aktivit. */
const activityCount = computed(() => config.getEffectiveTemplates().length)

/** Počet nastavených konektorů (Flexi + AI služby s neprázdným klíčem). */
const apiKeyCount = computed(() => {
  const flexi = loadFlexiConfig()
  const aiKeys = loadAiKeys()
  const flexiCount = flexi.url ? 1 : 0
  const aiCount = [GEMINI_SERVICE, OPENAI_SERVICE].filter((s) => aiKeys[s.id]).length
  return flexiCount + aiCount
})
</script>

<style scoped>
.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

</style>
