<template>
  <div class="container">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.config.activityTemplates }}</h1>
        <AppButton variant="primary" size="sm" @click="openAddTemplate">{{ t.config.addTemplate }}</AppButton>
      </div>
    </header>

    <p v-if="templates.length === 0" class="empty-state">
      {{ t.common.empty }}
    </p>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="tpl in templates"
        :key="tpl.key"
        :to="{ name: 'configActivityTemplate', params: { templateKey: tpl.key } }"
        :entity-id="tpl.key"
      >
        <h3 class="card-title">{{ tpl.name }}</h3>
        <p v-if="tpl.description" class="card-desc">{{ tpl.description }}</p>
        <div class="card-meta">
          <AppBadge :variant="`group-${tpl.group}`">{{ t.config.groupLabels[tpl.group] || tpl.group }}</AppBadge>
          <span v-if="(tpl.checklist || []).length" class="checklist-count">
            {{ t.config.checklist }}: {{ (tpl.checklist || []).length }} {{ t.config.items }}
          </span>
        </div>
      </EntityCard>
    </ul>

    <details class="deleted-section" v-if="deletedTemplates.length > 0">
      <summary class="deleted-summary">{{ t.config.deletedTemplates }} ({{ deletedTemplates.length }})</summary>
      <ul class="deleted-list" role="list">
        <li v-for="tpl in deletedTemplates" :key="tpl.key" class="deleted-item">
          <span class="deleted-name">{{ tpl.name }}</span>
          <AppBadge :variant="`group-${tpl.group}`">{{ t.config.groupLabels[tpl.group] || tpl.group }}</AppBadge>
          <AppButton variant="secondary" size="sm" @click="config.restoreTemplate(tpl.key)">{{ t.config.restoreTemplate }}</AppButton>
        </li>
      </ul>
    </details>

    <Modal v-if="editingTemplate !== null" :title="t.config.addTemplate" @close="closeTemplateModal">
      <form @submit.prevent="saveTemplate">
        <div class="form-group">
          <label for="tpl-name">{{ t.config.templateName }}</label>
          <input id="tpl-name" v-model="templateForm.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="tpl-group">{{ t.config.templateGroup }}</label>
          <select id="tpl-group" v-model="templateForm.group" class="form-control">
            <option v-for="(label, key) in t.config.groupLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tpl-desc">{{ t.config.templateDescription }}</label>
          <textarea id="tpl-desc" v-model="templateForm.description" class="form-control" rows="3" />
        </div>
        <div class="form-group form-group-row">
          <div class="form-group-half">
            <label for="tpl-sort">{{ t.config.templateSortOrder }}</label>
            <input id="tpl-sort" v-model.number="templateForm.sortOrder" type="number" class="form-control" />
          </div>
          <div class="form-group-half form-group-checkbox">
            <label class="checkbox-label">
              <input type="checkbox" v-model="templateForm.createOnNewProject" />
              {{ t.config.createOnNewProject }}
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>{{ t.config.checklist }}</label>
          <ul class="checklist-editor-list" role="list">
            <li v-for="(item, idx) in templateForm.checklist" :key="item.id" class="checklist-editor-item">
              <input v-model="item.label" class="form-control checklist-editor-input" :placeholder="t.config.checklistItemPlaceholder" />
              <AppButton variant="tertiary" size="sm" :aria-label="t.config.removeChecklistItem" @click="removeChecklistItem(idx)">✕</AppButton>
            </li>
          </ul>
          <div class="checklist-add-row">
            <input v-model="newChecklistLabel" class="form-control checklist-editor-input" :placeholder="t.config.checklistItemPlaceholder" @keydown.enter.prevent="addChecklistItem" />
            <AppButton variant="secondary" size="sm" @click="addChecklistItem">{{ t.config.addChecklistItem }}</AppButton>
          </div>
        </div>
        <div class="form-actions">
          <AppButton variant="secondary" @click="closeTemplateModal">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
/**
 * Seznam šablon aktivit – po výběru přechod na editaci checklistu a dalších atributů.
 */
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import EntityCard from '../components/EntityCard.vue'
import Modal from '../components/Modal.vue'
import AppBadge from '../components/AppBadge.vue'
import AppButton from '../components/AppButton.vue'

const router = useRouter()
const config = useConfig()
const { t } = useI18n()
const { generateId } = useEntityHelpers()

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.activities },
])

const templates = computed(() => config.getEffectiveTemplates())
const deletedTemplates = computed(() => config.getDeletedBuiltInTemplates())

const editingTemplate = ref(null)
const templateForm = reactive({
  name: '',
  group: 'project',
  description: '',
  sortOrder: 9999,
  createOnNewProject: false,
  checklist: [],
})
const newChecklistLabel = ref('')

function openAddTemplate() {
  editingTemplate.value = {}
  templateForm.name = ''
  templateForm.group = 'project'
  templateForm.description = ''
  templateForm.sortOrder = 9999
  templateForm.createOnNewProject = false
  templateForm.checklist = []
  newChecklistLabel.value = ''
}

function closeTemplateModal() {
  editingTemplate.value = null
}

function addChecklistItem() {
  const label = newChecklistLabel.value.trim()
  if (!label) return
  templateForm.checklist.push({ id: generateId(), label })
  newChecklistLabel.value = ''
}

function removeChecklistItem(idx) {
  templateForm.checklist.splice(idx, 1)
}

function saveTemplate() {
  const key = config.addCustomTemplate({
    name: templateForm.name,
    group: templateForm.group,
    description: templateForm.description,
    sortOrder: templateForm.sortOrder,
    createOnNewProject: templateForm.createOnNewProject,
    checklist: templateForm.checklist.map((ci) => ({ id: ci.id, label: ci.label })),
  })
  closeTemplateModal()
  router.push({ name: 'configActivityTemplate', params: { templateKey: key } })
}
</script>

<style scoped>
.header-row { gap: var(--space-md); flex-wrap: wrap; }
.header-row h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }

.checklist-count { display: inline-block; font-size: 0.8rem; color: var(--text-muted); }

.deleted-section { margin-top: var(--space-lg); border-top: 1px solid var(--border); padding-top: var(--space-md); }
.deleted-summary { cursor: pointer; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; padding: var(--space-xs) 0; user-select: none; }
.deleted-list { list-style: none; margin: var(--space-sm) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.deleted-item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) 0; border-bottom: 1px solid var(--border); }
.deleted-item:last-child { border-bottom: none; }
.deleted-name { flex: 1; font-size: 0.92rem; color: var(--text-muted); }

.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }
.checklist-editor-list { list-style: none; margin: 0 0 var(--space-sm); padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.checklist-editor-item { display: flex; align-items: center; gap: var(--space-xs); }
.checklist-editor-input { flex: 1; }
.checklist-add-row { display: flex; gap: var(--space-xs); align-items: center; }
</style>
