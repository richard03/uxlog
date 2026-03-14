<template>
  <div class="container" v-if="project && item">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-title-row">
        <div class="header-title">
          <div class="header-title-main">
            <button class="editable-name" @click="openEdit('name')" :aria-label="`${t.common.edit} – ${t.competition.name}`">
              <h1><ProjectColorTag :color="project?.color" />{{ item.name || t.competition.name }}</h1>
              <svg class="pencil" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <p class="entity-type">{{ t.competition.label }}</p>
        </div>
        <div class="header-actions">
          <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
          <ExportButton :get-yaml="() => store.exportEntityData('competitions', item?.id)" :filename="item?.name || t.competition.label" />
          <KebabMenu
            :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.competition.delete, action: 'delete', variant: 'danger' }]"
            @action="(a) => { if (a === 'move') showMove = true; else if (a === 'delete') confirmDelete() }"
          />
        </div>
      </div>
    </header>

    <section class="detail-section">
      <dl class="detail-list">
        <InlineEditableDetailField
          v-for="field in visibleFields"
          :key="field.key"
          :label="field.label"
          :empty="isFieldEmpty(field)"
          :display-value="displayFieldValue(field)"
          :raw-value="getFieldValue(field)"
          :field="field"
          :show-as-link="field.type === 'url' && isUrl(getFieldValue(field))"
          :cancel-text="t.common.cancel"
          :save-text="t.common.save"
          @edit="openEdit(field.key)"
          @save="(val) => saveFieldInline(field.key, val)"
        />
      </dl>
    </section>

    <Modal v-if="editingField" :title="editingLabel" @close="closeEdit">
      <form @submit.prevent="saveField">
        <div class="form-group">
          <label for="edit-field">{{ editingLabel }}</label>
          <input v-if="editingType === 'text' || editingType === 'url' || editingType === 'email' || editingType === 'tel'" id="edit-field" v-model="editValue" class="form-control" />
          <textarea v-else-if="editingType === 'textarea'" id="edit-field" v-model="editValue" class="form-control" rows="4" />
          <select v-else-if="editingType === 'select'" id="edit-field" v-model="editValue" class="form-control">
            <option v-for="opt in editingOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-actions">
          <AppButton variant="secondary" @click="closeEdit">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </div>
      </form>
    </Modal>

    <EntityConnections :project-id="projectId" entity-type="competitions" :entity-id="item.id" />

    <ConfirmDialog v-if="showConfirm" :title="t.competition.delete" :message="t.competition.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="competitions" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="router.push({ name: 'competition', params: { id: projectId } })" />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityFields } from '../composables/useEntityFields.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import Breadcrumb from '../components/Breadcrumb.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import AppButton from '../components/AppButton.vue'
import EntityConnections from '../components/EntityConnections.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getCompetition(route.params.competitionId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.competition, to: { name: 'competition', params: { id: projectId.value } } },
  { label: item.value?.name || t.competition.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)

const headerFields = [
  { key: 'name', label: t.competition.name, type: 'text' },
]

const {
  visibleFields, editingField, editValue,
  editingLabel, editingType, editingOptions,
  getFieldValue, displayFieldValue, isFieldEmpty, isUrl,
  openEdit, closeEdit, saveField, saveFieldInline,
} = useEntityFields('competition', item, (u) => store.updateCompetition(item.value.id, u), headerFields)

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteCompetition(item.value.id)
    router.push({ name: 'competition', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>
