<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1><ProjectColorTag :color="project?.color" />{{ t.sections.team }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="showImport = true">{{ t.project.import }}</button>
          <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'teamMembers')" :filename="t.sections.team" />
          <button type="button" class="btn btn-primary" @click="openForm()">{{ t.teamMember.add }}</button>
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
        :kebab-items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.teamMember.delete, action: 'delete', variant: 'danger' }]"
        @action="(a) => { if (a === 'delete') confirmDeleteItem(m.id); else if (a === 'move') confirmMoveItem(m.id) }"
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
        <div class="form-group">
          <label for="tm-name">{{ t.teamMember.name }}</label>
          <input id="tm-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="tm-role">{{ t.teamMember.role }}</label>
          <input id="tm-role" v-model="form.role" />
        </div>
        <div class="form-group">
          <label for="tm-email">{{ t.teamMember.email }}</label>
          <input id="tm-email" type="email" v-model="form.email" />
        </div>
        <div class="form-group">
          <label for="tm-phone">{{ t.teamMember.phone }}</label>
          <input id="tm-phone" type="tel" v-model="form.phone" />
        </div>
        <div class="form-group">
          <label for="tm-note">{{ t.teamMember.note }}</label>
          <textarea id="tm-note" v-model="form.note" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
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
