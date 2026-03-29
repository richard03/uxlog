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
      <EntityCard
        v-for="entityType in entityTypes"
        :key="entityType"
        :to="{ name: 'configEntityAttrs', params: { entityType } }"
        :entity-id="entityType"
      >
        <div class="card-header">
          <h3 class="card-title">{{ t.config.entityTypes[entityType] || entityType }}</h3>
        </div>
        <div class="card-meta">
          <div class="field-badges" aria-hidden="true">
            <span
              v-for="label in getEntityFieldInfo(entityType).visible"
              :key="label"
              class="field-badge"
            >{{ label }}</span>
            <span v-if="getEntityFieldInfo(entityType).rest > 0" class="field-badge field-badge-more">
              … a {{ getEntityFieldInfo(entityType).rest }} dalších
            </span>
          </div>
        </div>
      </EntityCard>
    </ul>
  </div>
</template>

<script setup>
/**
 * Seznam typů entit – po výběru přechod na editaci atributů.
 */
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import { useConfig } from '../composables/useConfig.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import EntityCard from '../components/EntityCard.vue'

const { t, tPath } = useI18n()
const config = useConfig()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.entities },
])

/** Seznam klíčů typů entit. */
const entityTypes = computed(() => Object.keys(config.ENTITY_FIELD_DEFAULTS))

const MAX_BADGES = 7

/**
 * Vrátí pole názvů atributů (max MAX_BADGES) a počet dalších pro daný typ entity.
 */
function stripParens(label) {
  return label.replace(/\s*\(.*?\)\s*$/, '').trim()
}

function getEntityFieldInfo(entityType) {
  const fields = config.getEffectiveEntityFields(entityType, tPath)
  const labels = fields.map((f) => stripParens(f.label))
  const visible = labels.slice(0, MAX_BADGES)
  const rest = labels.length - visible.length
  return { visible, rest }
}
</script>

<style scoped>
.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.field-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: 0.25rem;
}

.field-badge {
  display: inline-block;
  font-size: 0.72rem;
  padding: 0.1em 0.5em;
  border-radius: 4px;
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1px solid var(--border);
  white-space: nowrap;
}

.field-badge-more {
  font-style: italic;
}

.empty-state {
  color: var(--text-muted);
}
</style>
