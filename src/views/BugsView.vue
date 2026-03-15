<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.bugs }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'bugs')" :filename="t.sections.bugs" />
          <AppButton variant="primary" @click="openForm()">{{ t.bug.add }}</AppButton>
        </div>
      </div>
    </header>

    <div v-if="bugs.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="bug in bugs"
        :key="bug.id"
        :to="{ name: 'bugDetail', params: { id: projectId, bugId: bug.id } }"
        :entity-id="bug.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.bug.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(bug.id); else if (a === 'move') confirmMoveItem(bug.id); else if (a === 'copy') copyTarget.value = bug.id }"
      >
        <div class="card-badges">
          <AppBadge v-if="bug.code" variant="badge-accent">{{ bug.code }}</AppBadge>
          <AppBadge v-if="bug.severity" :variant="`severity-${bug.severity}`">{{ t.bug.severity }}: {{ t.bug.severityOptions[bug.severity] }}</AppBadge>
          <AppBadge v-if="bug.impact" :variant="`impact-${bug.impact}`">{{ t.bug.impact }}: {{ t.bug.impactShort[bug.impact] }}</AppBadge>
          <AppBadge v-if="bugPriority(bug)" :variant="`priority-${bugPriority(bug)}`">{{ t.bug.priority }}: {{ t.bug.priorityOptions[bugPriority(bug)] }}</AppBadge>
          <AppBadge>{{ t.bug.statusOptions[bug.status] }}</AppBadge>
        </div>
        <h3 class="card-title">{{ bug.name || t.bug.name }}</h3>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.bug.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.bug.code" control-id="bug-code" />
        <FormInput v-model="form.name" :label="t.bug.name" control-id="bug-name" required />
        <FormTextarea v-model="form.expectedBehavior" :label="t.bug.expectedBehavior" control-id="bug-expected" :rows="3" />
        <FormTextarea v-model="form.actualBehavior" :label="t.bug.actualBehavior" control-id="bug-actual" :rows="3" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.bug.delete"
      :message="t.bug.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="bugs" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="bugs" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { getBugPriority } from '../lib/models.js'
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const bugs = computed(() => store.getBugs(projectId.value))
const dnd = useDraggableList(() => bugs.value, (orderedIds) => store.reorderEntities('bugs', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.bugs },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', expectedBehavior: '', actualBehavior: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteBug(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }

function bugPriority(bug) {
  return getBugPriority(bug.severity, bug.impact)
}

function openForm() {
  form.value = { code: generateNextCode('BUG', bugs.value), name: '', expectedBehavior: '', actualBehavior: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addBug(projectId.value, form.value)
  closeForm()
}
</script>

