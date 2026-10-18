<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="t.history.title" />

    <ColumnHeading :title="t.history.title" />
    <p class="history-intro">{{ t.history.intro }}</p>

    <div v-if="entries.length === 0" class="empty-state">
      <p>{{ t.history.empty }}</p>
      <p>{{ t.history.emptyHint }}</p>
    </div>

    <ol v-else class="history-list" :aria-label="t.history.listLabel">
      <li
        v-for="e in entries"
        :key="e.id"
        class="history-item"
        :class="{ 'history-item--reverted': e.reverted }"
      >
        <div class="history-row">
          <div class="history-main">
            <time class="history-time" :datetime="e.at">{{ formatStatusBarDateTime(e.at) }}</time>
            <span class="history-summary">{{ e.summary }}</span>
            <span v-if="e.more" class="history-more">{{ e.more }}</span>
          </div>
          <AppBadge v-if="e.reverted">{{ t.history.reverted }}</AppBadge>
          <AppButton v-else variant="secondary" size="sm" @click="onRevert(e.id)">{{ t.history.revert }}</AppButton>
        </div>
        <details v-if="e.details.length > 1 || e.details[0]?.fields" class="history-details">
          <summary>{{ t.history.details }}</summary>
          <ul>
            <li v-for="d in e.details" :key="d.key">
              {{ d.text }}<span v-if="d.fields" class="history-fields"> – {{ t.history.changedFields }}: {{ d.fields }}</span>
            </li>
          </ul>
        </details>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useProjectHistory } from '../composables/useProjectHistory.js'
import { showToast } from '../composables/useToast.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import AppBadge from '../components/AppBadge.vue'
import AppButton from '../components/AppButton.vue'
import { formatStatusBarDateTime } from '../utils/formatDate.js'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const { entries, revert } = useProjectHistory(projectId)

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.history.title },
])

function onRevert(entryId) {
  showToast(revert(entryId) ? t.history.revertDone : t.history.revertNothing)
}
</script>

<style scoped>
.history-intro {
  margin: 0 0 var(--space-md);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.history-item {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.history-item--reverted .history-summary {
  color: var(--text-muted);
  text-decoration: line-through;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.history-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.history-time {
  color: var(--text-muted);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.history-summary {
  overflow-wrap: anywhere;
}

.history-more,
.history-fields {
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.history-details {
  margin-top: var(--space-xs);
  font-size: 0.875rem;
}

.history-details summary {
  cursor: pointer;
  color: var(--text-muted);
}

.history-details ul {
  margin: var(--space-xs) 0 0;
  padding-left: var(--space-lg);
}
</style>
