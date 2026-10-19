<template>
  <div class="container" v-if="project && item">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="item.name || t.hypothesis.name">
      <template #actions>
        <!-- V okně nad plátnem bez importu a exportu -->
        <AppButton v-if="!inCanvas" variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton v-if="!inCanvas" :get-yaml="() => store.exportEntityData('hypotheses', item?.id)" :filename="item?.name || t.hypothesis.label" />
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.hypothesis.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'move') showMove = true; else if (a === 'copy') showCopy = true; else if (a === 'delete') confirmDelete() }"
        />
      </template>
    </ProjectPageHeader>

    <ColumnHeading
      :title="`${t.hypothesis.label} ${item.name || ''}`.trim()"
      :on-edit="() => openEdit('name')"
      :edit-label="`${t.common.edit} – ${t.hypothesis.name}`">
      <template #sub>
        <button class="editable-code" @click="openEdit('code')" :aria-label="`${t.common.edit} – ${t.hypothesis.code}`"><span>{{ item.code || '–' }}</span><svg class="pencil" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
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

    <EntityConnections :project-id="projectId" entity-type="hypotheses" :entity-id="item.id" />

    <ConfirmDialog v-if="showConfirm" :title="t.hypothesis.delete" :message="t.hypothesis.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="hypotheses" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="leaveDetail({ name: 'hypothesis', params: { id: projectId } })" />
    <MoveToProjectModal v-if="showCopy" mode="copy" state-key="hypotheses" :entity-id="item?.id" :current-project-id="projectId" @close="showCopy = false" @copied="showCopy = false" />
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
const item = computed(() => store.getHypothesis(route.params.hypothesisId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.hypothesis, to: { name: 'hypothesis', params: { id: projectId.value } } },
  { label: item.value?.name || t.hypothesis.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const showCopy = ref(false)

const headerFields = [
  { key: 'code', label: t.hypothesis.code, type: 'text' },
  { key: 'name', label: t.hypothesis.name, type: 'text' },
]

const {
  visibleFields, editingField, editValue,
  editingLabel, editingType, editingOptions,
  getFieldValue, displayFieldValue, isFieldEmpty, isUrl,
  openEdit, closeEdit, saveField, saveFieldInline,
} = useEntityFields('hypothesis', item, (u) => store.updateHypothesis(item.value.id, u), headerFields)

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteHypothesis(item.value.id)
    leaveDetail({ name: 'hypothesis', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>
