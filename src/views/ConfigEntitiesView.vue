<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <h1>{{ t.config.entities }}</h1>
    </header>

    <p v-if="entityTypes.length === 0" class="empty-state">
      {{ t.common.empty }}
    </p>

    <ul v-else class="entity-list" role="list">
      <li v-for="entityType in entityTypes" :key="entityType" class="card card-clickable">
        <router-link :to="{ name: 'configEntityAttrs', params: { entityType } }" class="card-body">
          <h3 class="card-title">{{ t.config.entityTypes[entityType] || entityType }}</h3>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
/**
 * Seznam typů entit – po výběru přechod na editaci atributů.
 */
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { ENTITY_FIELD_DEFAULTS } from '../lib/entityFieldDefaults.js'
import Breadcrumb from '../components/Breadcrumb.vue'

const { t } = useI18n()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.entities },
])

/** Seznam klíčů typů entit. */
const entityTypes = computed(() => Object.keys(ENTITY_FIELD_DEFAULTS))
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.entity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
}

.card-body {
  flex: 1;
  text-decoration: none;
  color: inherit;
  display: block;
}

.card-clickable:hover {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.empty-state {
  color: var(--text-muted);
}
</style>
