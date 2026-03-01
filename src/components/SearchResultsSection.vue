<template>
  <section class="search-section" :aria-label="title">
    <h3 class="search-section-title">{{ title }}</h3>
    <ul class="search-list" role="list">
      <li v-for="item in items" :key="item.id">
        <router-link
          :to="getLink(item)"
          class="search-item"
          @click="emit('close')"
        >
          <span class="search-item-code" v-if="item.code">{{ item.code }}</span>
          <span class="search-item-name">{{ item.name || t.project.name }}</span>
        </router-link>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] },
  projectId: { type: [Function, String], default: null },
  section: { type: String, default: 'project' },
})

const emit = defineEmits(['close'])
const { t } = useI18n()

/**
 * Vytvoří odkaz na projekt nebo sekci projektu.
 */
function getLink(item) {
  const pid = typeof props.projectId === 'function' ? props.projectId(item) : (item?.projectId || item?.id)
  if (!pid) return { path: '/' }
  return props.section === 'project'
    ? { name: 'project', params: { id: pid } }
    : { name: props.section, params: { id: pid } }
}
</script>

<style scoped>
.search-section {
  margin-bottom: var(--space-md);
}

.search-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  color: var(--text);
  transition: background var(--transition);
}

.search-item:hover {
  background: var(--bg-muted);
}

.search-item-code {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.search-item-name {
  flex: 1;
}
</style>
