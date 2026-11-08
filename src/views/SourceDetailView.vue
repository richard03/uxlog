<template>
  <div class="container" v-if="project && item">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="item.name || t.source.name">
      <template #actions>
        <!-- V okně nad plátnem bez importu a exportu -->
        <AppButton v-if="!inCanvas" variant="secondary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton v-if="!inCanvas" :get-yaml="() => store.exportEntityData('sources', item?.id)" :filename="item?.name || t.source.label" />
        <KebabMenu
          :items="[{ label: t.common.moveToProject, action: 'move' }, { label: t.common.copyToProject, action: 'copy' }, { label: t.source.delete, action: 'delete', variant: 'danger' }]"
          @action="(a) => { if (a === 'move') showMove = true; else if (a === 'copy') showCopy = true; else if (a === 'delete') showConfirm = true }"
        />
      </template>
    </ProjectPageHeader>

    <DetailFrame>

    <ColumnHeading
      :title="`${t.source.label} ${item.name || ''}`.trim()"
      :on-edit="() => openEdit('name')"
      :edit-label="`${t.common.edit} – ${t.source.name}`">
      <template #sub>
        <button class="editable-code" @click="openEdit('code')" :aria-label="`${t.common.edit} – ${t.source.code}`"><span>{{ item.code || '–' }}</span><svg class="pencil" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </template>
      <template #actions>
        <AppButton
          variant="primary"
          size="sm"
          :disabled="!aiAvailable || status.processing || status.review || !item.content"
          @click="processSource(item.id)"
        >{{ status.processing ? t.sources.processing : item.processedAt ? t.sources.processAgain : t.sources.process }}</AppButton>
        <AiCancelButton v-if="status.processing" />
      </template>
    </ColumnHeading>

    <dl class="source-meta">
      <div><dt>{{ t.source.addedAt }}</dt><dd>{{ formatStatusBarDateTime(item.createdAt) || '—' }}</dd></div>
      <div v-if="item.fileName"><dt>{{ t.source.fileName }}</dt><dd>{{ item.fileName }}</dd></div>
      <div><dt>{{ t.source.processedAt }}</dt><dd>{{ item.processedAt ? formatStatusBarDateTime(item.processedAt) : t.source.notProcessed }}</dd></div>
    </dl>
    <p v-if="!aiAvailable" class="source-note">{{ t.sources.aiUnavailable }}</p>
    <p v-else-if="status.review" class="source-note" role="status">{{ t.sources.reviewPending }}</p>
    <p v-if="status.error" class="source-error" role="alert">{{ status.error }}</p>
    <p v-else-if="status.notice" class="source-note" role="status">{{ status.notice }}</p>

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
          <FormInput v-if="editingType === 'text'" control-id="edit-field" v-model="editValue" :dictation="editingType === 'text'" />
          <FormTextarea v-else-if="editingType === 'textarea'" control-id="edit-field" v-model="editValue" :rows="12" />
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

    <EntityConnections :project-id="projectId" entity-type="sources" :entity-id="item.id" />

    <!-- Revize návrhů AI ze zpracování tohoto zdroje -->
    <NotebookModal
      v-if="currentReview && currentReview.origin?.kind === 'source' && currentReview.origin.id === item.id"
      :key="currentReview.entryId"
      :actions="currentReview.actions"
      :helpers="reviewHelpers"
      @confirm-action="applyAction"
      @close="finishReview"
    />

    <ConfirmDialog v-if="showConfirm" :title="t.source.delete" :message="t.source.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />
    <MoveToProjectModal v-if="showMove" state-key="sources" :entity-id="item?.id" :current-project-id="projectId" @close="showMove = false" @moved="leaveDetail({ name: 'sources', params: { id: projectId } })" />
    <MoveToProjectModal v-if="showCopy" mode="copy" state-key="sources" :entity-id="item?.id" :current-project-id="projectId" @close="showCopy = false" @copied="showCopy = false" />
  </div>
  <div v-else-if="project && !item" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import FormInput from '../components/form/FormInput.vue'
import DetailFrame from '../components/DetailFrame.vue'
import FormTextarea from '../components/form/FormTextarea.vue'
/**
 * Detail zdroje: kdy byl nahrán a zpracován, typ a text, zpracování pomocí AI (tlačítkem)
 * s revizí návrhů a souvislosti se záznamy, které ze zdroje vznikly.
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useEntityNavigation } from '../composables/useEntityNavigation.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityFields } from '../composables/useEntityFields.js'
import { useNotebookChat } from '../composables/useNotebookChat.js'
import { formatStatusBarDateTime } from '../utils/formatDate.js'
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
import AiCancelButton from '../components/AiCancelButton.vue'
import EntityConnections from '../components/EntityConnections.vue'
import NotebookModal from '../components/NotebookModal.vue'

const route = useRoute()
const { leaveDetail, inCanvas } = useEntityNavigation()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const item = computed(() => store.getSource(route.params.sourceId))
const project = computed(() => store.getProject(projectId.value))

const { aiAvailable, processSource, sourceStatus, currentReview, applyAction, finishReview, reviewHelpers } = useNotebookChat(projectId)
const status = computed(() => sourceStatus(item.value?.id))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.sources, to: { name: 'sources', params: { id: projectId.value } } },
  { label: item.value?.name || t.source.label },
])

const showConfirm = ref(false)
const showImport = ref(false)
const showMove = ref(false)
const showCopy = ref(false)

const headerFields = [
  { key: 'code', label: t.source.code, type: 'text' },
  { key: 'name', label: t.source.name, type: 'text' },
]

const {
  visibleFields, editingField, editValue,
  editingLabel, editingType, editingOptions,
  getFieldValue, displayFieldValue, isFieldEmpty, isUrl,
  openEdit, closeEdit, saveField, saveFieldInline,
} = useEntityFields('source', item, (u) => store.updateSource(item.value.id, u), headerFields)

function doDelete() {
  if (item.value) {
    store.deleteSource(item.value.id)
    leaveDetail({ name: 'sources', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.source-meta { display: flex; flex-wrap: wrap; gap: var(--space-md); margin: 0 0 var(--space-md); font-size: 0.85rem; }
.source-meta dt { color: var(--text-muted); font-size: 0.75rem; }
.source-meta dd { margin: 0; }
.source-note { margin: 0 0 var(--space-sm); color: var(--text-muted); font-size: 0.85rem; }
.source-error { margin: 0 0 var(--space-sm); color: var(--error); font-size: 0.85rem; }
</style>
