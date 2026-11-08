<template>
  <div class="container" v-if="project && item">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="item.name || t.stakeholder.name">
      <template #actions>
        <!-- V okně nad plátnem bez importu a exportu -->
        <AppButton v-if="!inCanvas" variant="secondary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton v-if="!inCanvas" :get-yaml="() => store.exportEntityData('stakeholders', item?.id)" :filename="item?.name || t.stakeholder.label" />
        <KebabMenu
          :items="[{ label: t.entityConversion.action, action: 'changeType' }, { label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.stakeholder.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'changeType') showChangeType = true; else if (a === 'move') showMove = true; else if (a === 'copy') showCopy = true; else if (a === 'delete') confirmDelete() }"
        />
      </template>
    </ProjectPageHeader>

    <DetailFrame>

    <ColumnHeading
      :title="`${t.stakeholder.label} ${item.name || ''}`.trim()"
      :on-edit="() => openEdit('name')"
      :edit-label="`${t.common.edit} – ${t.stakeholder.name}`">
      <template #sub>
        <AppBadge v-if="strategy" :variant="`strategy-${strategy}`">{{ t.stakeholderStrategy[strategy] }}</AppBadge>
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
          <FormInput v-if="editingType === 'text' || editingType === 'url' || editingType === 'email' || editingType === 'tel'" control-id="edit-field" v-model="editValue" :dictation="editingType === 'text'" />
          <FormTextarea v-else-if="editingType === 'textarea'" control-id="edit-field" v-model="editValue" :rows="4" />
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

    </DetailFrame>

    <EntityConnections :project-id="projectId" entity-type="stakeholders" :entity-id="item.id" />

    <ConfirmDialog v-if="showConfirm" :title="t.stakeholder.delete" :message="t.stakeholder.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <ChangeEntityTypeModal v-if="showChangeType && item" collection="stakeholders" :entity="item" @close="showChangeType = false" @converted="onTypeChanged" />
    <MoveToProjectModal v-if="showMove" state-key="stakeholders" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="leaveDetail({ name: 'stakeholders', params: { id: projectId } })" />
    <MoveToProjectModal v-if="showCopy" mode="copy" state-key="stakeholders" :entity-id="item?.id" :current-project-id="projectId" @close="showCopy = false" @copied="showCopy = false" />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import FormInput from '../components/form/FormInput.vue'
import DetailFrame from '../components/DetailFrame.vue'
import FormTextarea from '../components/form/FormTextarea.vue'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityFields } from '../composables/useEntityFields.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import KebabMenu from '../components/KebabMenu.vue'
import MoveToProjectModal from '../components/MoveToProjectModal.vue'
import ChangeEntityTypeModal from '../components/ChangeEntityTypeModal.vue'
import InlineEditableDetailField from '../components/InlineEditableDetailField.vue'
import AppBadge from '../components/AppBadge.vue'
import AppButton from '../components/AppButton.vue'
import EntityConnections from '../components/EntityConnections.vue'

const route = useRoute()
const { leaveDetail, replaceDetail, inCanvas } = useEntityNavigation()
const store = useStore()
const { t } = useI18n()
const { getStakeholderStrategy } = useEntityHelpers()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getStakeholder(route.params.stakeholderId))
const project = computed(() => store.getProject(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.stakeholders, to: { name: 'stakeholders', params: { id: projectId.value } } },
  { label: item.value?.name || t.stakeholder.label },
])

const strategy = computed(() => getStakeholderStrategy(item.value?.influenceLevel, item.value?.interestLevel))

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const showChangeType = ref(false)

/** Po změně typu záznamu otevře detail nového záznamu (původní už neexistuje). */
function onTypeChanged({ collection, id }) {
  showChangeType.value = false
  replaceDetail(collection, projectId.value, id)
}
const showCopy = ref(false)

const headerFields = [
  { key: 'name', label: t.stakeholder.name, type: 'text' },
]

const {
  visibleFields, editingField, editValue,
  editingLabel, editingType, editingOptions,
  getFieldValue, displayFieldValue, isFieldEmpty, isUrl,
  openEdit, closeEdit, saveField,
  saveFieldInline,
} = useEntityFields('stakeholder', item, (u) => store.updateStakeholder(item.value.id, u), headerFields)

function confirmDelete() { showConfirm.value = true }

function doDelete() {
  if (item.value) {
    store.deleteStakeholder(item.value.id)
    leaveDetail({ name: 'stakeholders', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.entity-type { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; }
</style>
