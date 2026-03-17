<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.requirements }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'requirements')" :filename="t.sections.requirements" />
          <AppButton variant="primary" @click="openForm()">{{ t.requirement.add }}</AppButton>
        </div>
      </div>
    </header>

    <div class="filter-bar">
      <span class="filter-bar-label">{{ t.filter.priority }}</span>
      <div class="filter-bar-group">
        <button class="filter-badge" :class="{ 'filter-badge--active': filterMust }" type="button" @click="filterMust = !filterMust">{{ t.moscow.must }} ({{ countMust }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterShould }" type="button" @click="filterShould = !filterShould">{{ t.moscow.should }} ({{ countShould }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterCould }" type="button" @click="filterCould = !filterCould">{{ t.moscow.could }} ({{ countCould }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterWont }" type="button" @click="filterWont = !filterWont">{{ t.moscow.wont }} ({{ countWont }})</button>
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
        :to="{ name: 'requirementDetail', params: { id: projectId, requirementId: r.id } }"
        :entity-id="r.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.requirement.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(r.id); else if (a === 'move') confirmMoveItem(r.id); else if (a === 'copy') copyTarget.value = r.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="r.code" variant="badge-accent">{{ r.code }}</AppBadge>
          <AppBadge>{{ tPath(`moscow.${r.priority}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(r, 'requirement').filled === getEntityCompleteness(r, 'requirement').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(r, 'requirement').filled, getEntityCompleteness(r, 'requirement').total)"
          >{{ getEntityCompleteness(r, 'requirement').filled }}/{{ getEntityCompleteness(r, 'requirement').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ r.name || t.requirement.name }}</h3>
        <p v-if="r.description" class="card-desc">{{ r.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.requirement.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.requirement.code" control-id="r-code" />
        <FormInput v-model="form.name" :label="t.requirement.name" control-id="r-name" required />
        <FormSelect
          v-model="form.priority"
          :label="t.requirement.priority"
          control-id="r-moscow"
          :options="[
            { value: 'must', label: t.moscow.must },
            { value: 'should', label: t.moscow.should },
            { value: 'could', label: t.moscow.could },
            { value: 'wont', label: t.moscow.wont },
          ]"
        />
        <FormTextarea v-model="form.description" :label="t.requirement.description" control-id="r-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.requirement.delete"
      :message="t.requirement.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="requirements" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="requirements" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { generateNextCode } from '../lib/code.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import { getEntityCompleteness } from '../lib/completeness.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getRequirements(projectId.value))
const filterMust = ref(false)
const filterShould = ref(false)
const filterCould = ref(false)
const filterWont = ref(false)
const filterText = ref('')
const countMust = computed(() => items.value.filter(r => r.priority === 'must').length)
const countShould = computed(() => items.value.filter(r => r.priority === 'should').length)
const countCould = computed(() => items.value.filter(r => (r.priority || 'could') === 'could').length)
const countWont = computed(() => items.value.filter(r => r.priority === 'wont').length)
const visibleItems = computed(() => {
  const allowed = []
  if (filterMust.value) allowed.push('must')
  if (filterShould.value) allowed.push('should')
  if (filterCould.value) allowed.push('could')
  if (filterWont.value) allowed.push('wont')
  let base = allowed.length === 0 ? items.value : items.value.filter(r => allowed.includes(r.priority || 'could'))
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter(r => [r.code, r.name, r.description].filter(Boolean).join(' ').toLowerCase().includes(q))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('requirements', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.requirements },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteRequirement(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { code: generateNextCode('REQ', items.value), name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addRequirement(projectId.value, form.value)
  closeForm()
}
</script>
