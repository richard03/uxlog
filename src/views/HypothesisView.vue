<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="t.sections.hypothesis">
      <template #actions>
        <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'hypotheses')" :filename="t.sections.hypothesis" />
      </template>
    </ProjectPageHeader>

    <ColumnHeading :title="t.sections.hypothesis">
      <template #actions>
        <AppButton variant="primary" size="sm" @click="openForm()">{{ t.hypothesis.add }}</AppButton>
      </template>
    </ColumnHeading>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.status }}</span>
      <div class="filter-bar-group">
        <button class="filter-badge" :class="{ 'filter-badge--active': filterUntested }" type="button" @click="filterUntested = !filterUntested">{{ t.hypothesisStatus.untested }} ({{ countUntested }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterTested }" type="button" @click="filterTested = !filterTested">{{ t.hypothesisStatus.tested }} ({{ countTested }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterRefuted }" type="button" @click="filterRefuted = !filterRefuted">{{ t.hypothesisStatus.refuted }} ({{ countRefuted }})</button>
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
        v-for="h in visibleItems"
        :key="h.id"
        :to="{ name: 'hypothesisDetail', params: { id: projectId, hypothesisId: h.id } }"
        :entity-id="h.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.hypothesis.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(h.id); else if (a === 'move') confirmMoveItem(h.id); else if (a === 'copy') copyTarget = h.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="h.code" variant="badge-accent">{{ h.code }}</AppBadge>
          <AppBadge>{{ tPath(`hypothesisStatus.${h.status}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(h, 'hypothesis').filled === getEntityCompleteness(h, 'hypothesis').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(h, 'hypothesis').filled, getEntityCompleteness(h, 'hypothesis').total)"
          >{{ getEntityCompleteness(h, 'hypothesis').filled }}/{{ getEntityCompleteness(h, 'hypothesis').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ h.name || t.hypothesis.name }}</h3>
        <p v-if="h.description" class="card-desc">{{ h.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.hypothesis.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.hypothesis.code" control-id="h-code" />
        <FormInput v-model="form.name" :label="t.hypothesis.name" control-id="h-name" required />
        <FormTextarea v-model="form.description" :label="t.hypothesis.description" control-id="h-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.hypothesis.delete"
      :message="t.hypothesis.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="hypotheses" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="hypotheses" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import { filterByAnyActiveBranch } from '../lib/listFilters.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()
const { generateNextCode, getCodePrefix, getEntityCompleteness } = useEntityHelpers()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getHypotheses(projectId.value))
const filterUntested = ref(false)
const filterTested = ref(false)
const filterRefuted = ref(false)
const filterText = ref('')
const countUntested = computed(() => items.value.filter(h => (h.status || 'untested') === 'untested').length)
const countTested = computed(() => items.value.filter(h => h.status === 'tested').length)
const countRefuted = computed(() => items.value.filter(h => h.status === 'refuted').length)
const visibleItems = computed(() => {
  const base = filterByAnyActiveBranch(items.value, [
    { active: filterUntested.value, match: (h) => (h.status || 'untested') === 'untested' },
    { active: filterTested.value, match: (h) => h.status === 'tested' },
    { active: filterRefuted.value, match: (h) => h.status === 'refuted' },
  ])
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter(h => [h.code, h.name, h.description, t.hypothesisStatus[h.status || 'untested']].filter(Boolean).join(' ').toLowerCase().includes(q))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('hypotheses', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.hypothesis },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', status: 'untested', explanation: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteHypothesis(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { code: generateNextCode(getCodePrefix('hypothesis'), items.value), name: '', description: '', status: 'untested', explanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addHypothesis(projectId.value, form.value)
  closeForm()
}
</script>
