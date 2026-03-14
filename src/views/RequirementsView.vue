<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.requirements }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'requirements')" :filename="t.sections.requirements" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.requirement.add }}</button>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="r in items"
        :key="r.id"
        :to="{ name: 'requirementDetail', params: { id: projectId, requirementId: r.id } }"
        :entity-id="r.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.requirement.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(r.id); else if (a === 'move') confirmMoveItem(r.id) }"
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
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
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

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getRequirements(projectId.value))
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
