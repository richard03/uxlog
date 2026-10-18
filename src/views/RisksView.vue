<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="t.sections.risks">
      <template #actions>
        <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'risks')" :filename="t.sections.risks" />
      </template>
    </ProjectPageHeader>

    <ColumnHeading :title="t.sections.risks">
      <template #actions>
        <AppButton variant="primary" size="sm" @click="openForm()">{{ t.risk.add }}</AppButton>
      </template>
    </ColumnHeading>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.status }}</span>
      <div class="filter-bar-group">
        <button
          v-for="s in STATUSES"
          :key="s"
          class="filter-badge"
          :class="{ 'filter-badge--active': statusFilters[s] }"
          type="button"
          @click="statusFilters[s] = !statusFilters[s]"
        >{{ t.riskStatus[s] }} ({{ countByStatus[s] }})</button>
      </div>
      <div class="filter-search">
        <input type="search" v-model="filterText" :placeholder="t.filter.search" class="filter-search-input" :aria-label="t.filter.search" />
        <button v-if="filterText" class="filter-search-clear" type="button" :aria-label="t.filter.clearSearch" @click="filterText = ''">&#x2715;</button>
      </div>
    </div>

    <div v-if="visibleItems.length === 0" class="empty-state">
      <template v-if="items.length === 0">
        <p>{{ t.common.empty }}</p>
        <p>{{ t.common.emptyHint }}</p>
      </template>
      <template v-else>
        <p>{{ t.filter.emptyFiltered }}</p>
        <p>{{ t.filter.emptyFilteredHint }}</p>
      </template>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="r in visibleItems"
        :key="r.id"
        :to="{ name: 'riskDetail', params: { id: projectId, riskId: r.id } }"
        :entity-id="r.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.risk.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') deleteTarget = r.id; else if (a === 'move') moveTarget = r.id; else if (a === 'copy') copyTarget = r.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="r.code" variant="badge-accent">{{ r.code }}</AppBadge>
          <AppBadge>{{ t.riskStatus[r.status] || t.riskStatus.open }}</AppBadge>
          <AppBadge v-if="r.likelihood">{{ t.risk.likelihood }}: {{ t.riskLevel[r.likelihood] }}</AppBadge>
          <AppBadge v-if="r.impact">{{ t.risk.impact }}: {{ t.riskLevel[r.impact] }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(r, 'risk').filled === getEntityCompleteness(r, 'risk').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(r, 'risk').filled, getEntityCompleteness(r, 'risk').total)"
          >{{ getEntityCompleteness(r, 'risk').filled }}/{{ getEntityCompleteness(r, 'risk').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ r.name || t.risk.name }}</h3>
        <p v-if="r.description" class="card-desc">{{ r.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.risk.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.risk.code" control-id="r-code" />
        <FormInput v-model="form.name" :label="t.risk.name" control-id="r-name" required />
        <FormTextarea v-model="form.description" :label="t.risk.description" control-id="r-desc" />
        <FormTextarea v-model="form.mitigation" :label="t.risk.mitigation" control-id="r-mitigation" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.risk.delete"
      :message="t.risk.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="risks" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="risks" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import { filterByAnyActiveBranch } from '../lib/listFilters.js'

const STATUSES = ['open', 'mitigated', 'occurred', 'closed']

const route = useRoute()
const store = useStore()
const { t } = useI18n()
const { generateNextCode, getCodePrefix, getEntityCompleteness } = useEntityHelpers()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getRisks(projectId.value))
/** Stav rizika s výchozí hodnotou pro starší / neúplná data. */
const statusOf = (r) => (STATUSES.includes(r.status) ? r.status : 'open')

const statusFilters = reactive(Object.fromEntries(STATUSES.map((s) => [s, false])))
const filterText = ref('')
const countByStatus = computed(() =>
  Object.fromEntries(STATUSES.map((s) => [s, items.value.filter((r) => statusOf(r) === s).length]))
)
const visibleItems = computed(() => {
  const base = filterByAnyActiveBranch(
    items.value,
    STATUSES.map((s) => ({ active: statusFilters[s], match: (r) => statusOf(r) === s })),
  )
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter((r) => [r.code, r.name, r.description, r.mitigation, t.riskStatus[statusOf(r)]].filter(Boolean).join(' ').toLowerCase().includes(q))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('risks', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.risks },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', mitigation: '' })

const deleteTarget = ref(null)
const moveTarget = ref(null)
const copyTarget = ref(null)

function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteRisk(deleteTarget.value)
    deleteTarget.value = null
  }
}

function openForm() {
  form.value = { code: generateNextCode(getCodePrefix('risk'), items.value), name: '', description: '', mitigation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addRisk(projectId.value, form.value)
  closeForm()
}
</script>
