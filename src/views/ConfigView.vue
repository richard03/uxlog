<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.config.title }}</h1>
    </header>

    <nav class="config-nav" aria-label="Sekce konfigurace">
      <router-link :to="{ name: 'configEntities' }" class="config-box">
        {{ t.config.entities }}
        <span class="config-count">{{ entityCount }}</span>
      </router-link>
      <router-link :to="{ name: 'configActivities' }" class="config-box">
        {{ t.config.activities }}
        <span class="config-count">{{ activityCount }}</span>
      </router-link>
    </nav>
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

const config = useConfig()
const { t } = useI18n()

/** Počet typů entit (goal, stakeholder, …). */
const entityCount = computed(() => Object.keys(ENTITY_FIELD_DEFAULTS).length)

/** Počet definovaných šablon aktivit. */
const activityCount = computed(() => config.getEffectiveTemplates().length)
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.config-nav {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  max-width: 600px;
}

.config-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  text-align: center;
  text-decoration: none;
  font-weight: 600;
  transition: border-color var(--transition), background var(--transition);
}

.config-box:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.config-box.router-link-active {
  border-color: var(--accent);
  background: var(--accent-muted);
  font-weight: 600;
}

.config-count {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
  margin-top: var(--space-xs);
}
</style>
