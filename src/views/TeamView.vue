<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.team }}</h1>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'teamMembers')" :filename="t.sections.team" />
          <AppButton variant="primary" @click="openForm()">{{ t.teamMember.add }}</AppButton>
        </div>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="m in items"
        :key="m.id"
        :to="{ name: 'teamMemberDetail', params: { id: projectId, memberId: m.id } }"
        :entity-id="m.id"
        :dnd="dnd"
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.teamMember.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(m.id); else if (a === 'move') confirmMoveItem(m.id); else if (a === 'copy') copyTarget = m.id }"
      >
        <h3 class="card-title">{{ m.name || t.teamMember.name }}</h3>
        <div v-if="m.email || m.phone || m.role" class="card-meta">
          <AppBadge v-if="m.role">{{ m.role }}</AppBadge>
          <AppBadge v-if="m.email">{{ m.email }}</AppBadge>
          <AppBadge v-if="m.phone">{{ m.phone }}</AppBadge>
        </div>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.teamMember.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.name" :label="t.teamMember.name" control-id="tm-name" required />
        <FormInput v-model="form.role" :label="t.teamMember.role" control-id="tm-role" />
        <FormInput v-model="form.email" :label="t.teamMember.email" type="email" control-id="tm-email" />
        <FormInput v-model="form.phone" :label="t.teamMember.phone" type="tel" control-id="tm-phone" />
        <FormTextarea v-model="form.note" :label="t.teamMember.note" control-id="tm-note" :rows="3" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="t.teamMember.delete"
      :message="t.teamMember.deleteConfirm"
      @confirm="doDeleteItem"
      @cancel="deleteTarget = null"
    />
    <MoveToProjectModal v-if="moveTarget" state-key="teamMembers" :entity-id="moveTarget" :current-project-id="projectId" @close="moveTarget = null" @moved="moveTarget = null" />
    <MoveToProjectModal v-if="copyTarget" mode="copy" state-key="teamMembers" :entity-id="copyTarget" :current-project-id="projectId" @close="copyTarget = null" @copied="copyTarget = null" />
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
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import { FormInput, FormTextarea, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getTeamMembers(projectId.value))
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('teamMembers', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.team },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ name: '', role: '', email: '', phone: '', note: '' })

const deleteTarget = ref(null)
function confirmDeleteItem(id) { deleteTarget.value = id }
function doDeleteItem() {
  if (deleteTarget.value) {
    store.deleteTeamMember(deleteTarget.value)
    deleteTarget.value = null
  }
}

const moveTarget = ref(null)
const copyTarget = ref(null)
function confirmMoveItem(id) { moveTarget.value = id }


function openForm() {
  form.value = { name: '', role: '', email: '', phone: '', note: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addTeamMember(projectId.value, form.value)
  closeForm()
}
</script>
