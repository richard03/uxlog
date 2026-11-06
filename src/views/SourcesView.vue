<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="t.sections.sources">
      <template #actions>
        <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'sources')" :filename="t.sections.sources" />
      </template>
    </ProjectPageHeader>

    <ColumnHeading :title="t.sections.sources">
      <template #actions>
        <AppButton variant="primary" size="sm" @click="showAdd = true">{{ t.source.add }}</AppButton>
      </template>
    </ColumnHeading>
    <p class="sources-hint">{{ t.sources.hint }}</p>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.source.kind }}</span>
      <div class="filter-bar-group">
        <button
          v-for="k in KINDS"
          :key="k"
          class="filter-badge"
          :class="{ 'filter-badge--active': kindFilters[k] }"
          type="button"
          @click="kindFilters[k] = !kindFilters[k]"
        >{{ t.sourceKind[k] }} ({{ countByKind[k] }})</button>
        <button
          class="filter-badge"
          :class="{ 'filter-badge--active': onlyUnprocessed }"
          type="button"
          @click="onlyUnprocessed = !onlyUnprocessed"
        >{{ t.sources.unprocessed }} ({{ unprocessedCount }})</button>
      </div>
      <div class="filter-search">
        <input type="search" v-model="filterText" :placeholder="t.filter.search" class="filter-search-input" :aria-label="t.filter.search" />
        <button v-if="filterText" class="filter-search-clear" type="button" :aria-label="t.filter.clearSearch" @click="filterText = ''">&#x2715;</button>
      </div>
    </div>

    <div v-if="visibleItems.length === 0" class="empty-state">
      <template v-if="items.length === 0">
        <p>{{ t.common.empty }}</p>
        <p>{{ t.sources.emptyHint }}</p>
      </template>
      <template v-else>
        <p>{{ t.filter.emptyFiltered }}</p>
        <p>{{ t.filter.emptyFilteredHint }}</p>
      </template>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="s in visibleItems"
        :key="s.id"
        :to="{ name: 'sourceDetail', params: { id: projectId, sourceId: s.id } }"
        :entity-id="s.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.source.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') deleteTarget = s.id; else if (a === 'move') moveTarget = s.id; else if (a === 'copy') copyTarget = s.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="s.code" variant="badge-accent">{{ s.code }}</AppBadge>
          <AppBadge>{{ t.sourceKind[s.kind] || t.sourceKind.other }}</AppBadge>
          <AppBadge :variant="s.processedAt ? 'completeness-done' : ''">
            {{ s.processedAt ? `${t.source.processedAt} ${formatDate(s.processedAt)}` : t.source.notProcessed }}
          </AppBadge>
          <AppBadge>{{ t.source.addedAt }} {{ formatDate(s.createdAt) }}</AppBadge>
        </div>
        <h3 class="card-title">{{ s.name || t.source.label }}</h3>
        <p v-if="s.content" class="card-desc">{{ snippet(s.content) }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <AddSourceModal
      v-if="showAdd"
      :project-id="projectId"
      @close="showAdd = false"
      @saved="(s) => { showAdd = false; router.push({ name: 'sourceDetail', params: { id: projectId, sourceId: s.id } }) }"
    />

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.source.delete"
      :message="t.source.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="sources" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="sources" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
  </div>
</template>

<script setup>
/**
 * Seznam zdrojů projektu (dokumenty, přepisy rozhovorů, e-maily, vložené texty).
 */
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import AppButton from '../components/AppButton.vue'
import AddSourceModal from '../components/AddSourceModal.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { formatDate } from '../utils/formatDate.js'

const KINDS = ['document', 'interview', 'email', 'other']

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getSources(projectId.value))
const kindOf = (s) => (KINDS.includes(s.kind) ? s.kind : 'other')

const kindFilters = reactive(Object.fromEntries(KINDS.map((k) => [k, false])))
const onlyUnprocessed = ref(false)
const filterText = ref('')
const countByKind = computed(() => Object.fromEntries(KINDS.map((k) => [k, items.value.filter((s) => kindOf(s) === k).length])))
const unprocessedCount = computed(() => items.value.filter((s) => !s.processedAt).length)

const visibleItems = computed(() => {
  const activeKinds = KINDS.filter((k) => kindFilters[k])
  const q = filterText.value.toLowerCase().trim()
  return items.value.filter((s) =>
    (!activeKinds.length || activeKinds.includes(kindOf(s)))
    && (!onlyUnprocessed.value || !s.processedAt)
    && (!q || [s.code, s.name, s.fileName, s.content].filter(Boolean).join(' ').toLowerCase().includes(q)))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('sources', projectId.value, orderedIds))

/** Začátek textu zdroje pro kartu. */
function snippet(text) {
  const s = String(text).replace(/\s+/g, ' ').trim()
  return s.length > 220 ? `${s.slice(0, 217)}…` : s
}

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.sources },
])

const showAdd = ref(false)
const showImport = ref(false)
const deleteTarget = ref(null)
const moveTarget = ref(null)
const copyTarget = ref(null)

function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteSource(deleteTarget.value)
    deleteTarget.value = null
  }
}
</script>

<style scoped>
.sources-hint { margin: 0 0 var(--space-md); color: var(--text-muted); font-size: 0.9rem; max-width: 80ch; }
</style>
