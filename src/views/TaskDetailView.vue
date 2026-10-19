<template>
  <div class="container" v-if="project && item">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="item.name || t.task.name">
      <template #actions>
        <!-- V okně nad plátnem bez importu a exportu -->
        <AppButton v-if="!inCanvas" variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton v-if="!inCanvas" :get-yaml="() => store.exportEntityData('tasks', item?.id)" :filename="item?.name || t.task.label" />
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.task.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'move') showMove = true; else if (a === 'copy') showCopy = true; else if (a === 'delete') confirmDelete() }"
        />
      </template>
    </ProjectPageHeader>

    <ColumnHeading
      :title="`${t.task.label} ${item.name || ''}`.trim()"
      :on-edit="() => openEdit('name')"
      :edit-label="`${t.common.edit} – ${t.task.name}`">
      <template #sub>
        <button class="editable-code" @click="openEdit('code')" :aria-label="`${t.common.edit} – ${t.task.code}`">
        <span>{{ item.code || '–' }}</span>
        <svg class="pencil" aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </template>
    </ColumnHeading>

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
          <input v-if="editingType === 'text' || editingType === 'url'" id="edit-field" v-model="editValue" class="form-control" />
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

    <EntityConnections :project-id="projectId" entity-type="tasks" :entity-id="item.id" />

    <ConfirmDialog v-if="showConfirm" :title="t.task.delete" :message="t.task.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="tasks" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="leaveDetail({ name: 'tasks', params: { id: projectId } })" />
    <MoveToProjectModal v-if="showCopy" mode="copy" state-key="tasks" :entity-id="item?.id" :current-project-id="projectId" @close="showCopy = false" @copied="showCopy = false" />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityFields } from '../composables/useEntityFields.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import AppButton from '../components/AppButton.vue'
import EntityConnections from '../components/EntityConnections.vue'

const route = useRoute()
const { leaveDetail, inCanvas } = useEntityNavigation()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getTask(route.params.taskId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.tasks, to: { name: 'tasks', params: { id: projectId.value } } },
  { label: item.value?.name || t.task.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const showCopy = ref(false)

const headerFields = [
  { key: 'code', label: t.task.code, type: 'text' },
  { key: 'name', label: t.task.name, type: 'text' },
]

const teamMemberOptions = computed(() => {
  const members = store.getTeamMembers(projectId.value)
  return [
    { value: '', label: '— nevybráno —' },
    ...members.map((m) => ({ value: m.name, label: m.name })),
  ]
})

const {
  visibleFields: baseVisibleFields, editingField, editValue,
  editingLabel, editingType, editingOptions,
  getFieldValue, displayFieldValue, isFieldEmpty, isUrl,
  openEdit, closeEdit, saveField, saveFieldInline,
} = useEntityFields('task', item, (u) => store.updateTask(item.value.id, u), headerFields)

const visibleFields = computed(() =>
  baseVisibleFields.value.map((f) =>
    f.key === 'assignee' ? { ...f, options: teamMemberOptions.value } : f
  )
)

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteTask(item.value.id)
    leaveDetail({ name: 'tasks', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

