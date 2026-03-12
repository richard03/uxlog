<template>
  <div class="container" v-if="template">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ template.name || t.config.activityTemplates }}</h1>
          <div class="header-actions">
          <KebabMenu
            :items="[{ label: t.common.delete, action: 'delete', variant: 'danger' }]"
            @action="confirmDelete"
          />
        </div>
      </div>
      <div class="header-meta">
        <span class="group-badge" :class="`group-${template.group}`">
          {{ t.config.groupLabels[template.group] || template.group }}
        </span>
      </div>
    </header>

    <section class="config-section" aria-labelledby="template-form-heading">
      <h2 id="template-form-heading" class="visually-hidden">{{ t.config.editTemplate }}</h2>

      <form @submit.prevent="saveTemplate" class="template-form">
        <div class="form-group">
          <label for="tpl-name">{{ t.config.templateName }}</label>
          <input id="tpl-name" v-model="form.name" class="form-control" required />
        </div>
        <div class="form-group">
          <label for="tpl-group">{{ t.config.templateGroup }}</label>
          <select id="tpl-group" v-model="form.group" class="form-control">
            <option v-for="(label, key) in t.config.groupLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tpl-desc">{{ t.config.templateDescription }}</label>
          <textarea id="tpl-desc" v-model="form.description" class="form-control" rows="3" />
        </div>
        <div class="form-group form-group-row">
          <div class="form-group-half">
            <label for="tpl-sort">{{ t.config.templateSortOrder }}</label>
            <input id="tpl-sort" v-model.number="form.sortOrder" type="number" class="form-control" />
          </div>
          <div class="form-group-half form-group-checkbox">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.createOnNewProject" />
              {{ t.config.createOnNewProject }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>{{ t.config.checklist }}</label>
          <ul class="checklist-editor-list" role="list">
            <li v-for="(item, idx) in form.checklist" :key="item.id" class="checklist-editor-item">
              <input
                v-model="item.label"
                class="form-control checklist-editor-input"
                :placeholder="t.config.checklistItemPlaceholder"
              />
              <button type="button" class="btn btn-ghost btn-sm" @click="removeChecklistItem(idx)" :aria-label="t.config.removeChecklistItem">
                ✕
              </button>
            </li>
          </ul>
          <div class="checklist-add-row">
            <input
              v-model="newChecklistLabel"
              class="form-control checklist-editor-input"
              :placeholder="t.config.checklistItemPlaceholder"
              @keydown.enter.prevent="addChecklistItem"
            />
            <button type="button" class="btn btn-secondary btn-sm" @click="addChecklistItem">
              {{ t.config.addChecklistItem }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="goBack">{{ t.common.back }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </section>

    <ConfirmDialog
      v-if="showConfirmDelete"
      :title="t.config.deleteTemplate"
      :message="t.config.templateDeleteConfirm"
      @confirm="doDelete"
      @cancel="showConfirmDelete = false"
    />
  </div>
  <div v-else class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
/**
 * Editace jedné šablony aktivity – název, skupina, checklist a další atributy.
 */
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfig } from '../composables/useConfig.js'
import { useI18n } from '../composables/useI18n.js'
import { generateId } from '../lib/id.js'
import Breadcrumb from '../components/Breadcrumb.vue'
import KebabMenu from '../components/KebabMenu.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const config = useConfig()
const { t } = useI18n()

const templateKey = computed(() => route.params.templateKey)

/** Aktuální šablona podle klíče. */
const template = computed(() => config.getTemplate(templateKey.value))

const breadcrumbs = computed(() => [
  { label: t.nav.config, to: { name: 'config' } },
  { label: t.config.activities, to: { name: 'configActivities' } },
  { label: template.value?.name ?? '…' },
])

const form = reactive({
  name: '',
  group: 'project',
  description: '',
  sortOrder: 9999,
  createOnNewProject: false,
  checklist: [],
})
const newChecklistLabel = ref('')

watch(template, (tpl) => {
  if (tpl) {
    form.name = tpl.name || ''
    form.group = tpl.group || 'project'
    form.description = tpl.description || ''
    form.sortOrder = tpl.sortOrder ?? 9999
    form.createOnNewProject = tpl.createOnNewProject ?? true
    form.checklist = (tpl.checklist || []).map((ci) => ({ ...ci }))
  }
}, { immediate: true })

watch(templateKey, (key) => {
  if (key && !config.getTemplate(key)) {
    router.replace({ name: 'configActivities' })
  }
}, { immediate: true })

function addChecklistItem() {
  const label = newChecklistLabel.value.trim()
  if (!label) return
  form.checklist.push({ id: generateId(), label })
  newChecklistLabel.value = ''
}

function removeChecklistItem(idx) {
  form.checklist.splice(idx, 1)
}

function saveTemplate() {
  config.updateTemplate(templateKey.value, {
    name: form.name,
    group: form.group,
    description: form.description,
    sortOrder: form.sortOrder,
    createOnNewProject: form.createOnNewProject,
    checklist: form.checklist.map((ci) => ({ id: ci.id, label: ci.label })),
  })
  goBack()
}

function goBack() {
  router.push({ name: 'configActivities' })
}

const showConfirmDelete = ref(false)

function confirmDelete() {
  showConfirmDelete.value = true
}

function doDelete() {
  config.deleteTemplate(templateKey.value)
  showConfirmDelete.value = false
  router.push({ name: 'configActivities' })
}
</script>

<style scoped>
.page-header { margin-bottom: var(--space-lg); }
.header-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); flex-wrap: wrap; }
.header-row h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
.header-meta { margin-top: var(--space-sm); }
.header-actions { display: flex; gap: var(--space-xs); }

.group-badge { display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 0.15em 0.55em; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-muted); }
.group-badge.group-project { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.group-badge.group-research { background: #fef9c3; color: #854d0e; border-color: #fef08a; }
.group-badge.group-design { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
@media (prefers-color-scheme: dark) { .group-badge.group-project { background: #0c4a6e; color: #bae6fd; } .group-badge.group-research { background: #451a03; color: #fef08a; } .group-badge.group-design { background: #3b0764; color: #e9d5ff; } }

.config-section { margin-bottom: var(--space-xl); padding: var(--space-lg); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); }
.template-form { max-width: 36rem; }
.form-group { margin-bottom: var(--space-md); }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }
.form-group-row { display: flex; gap: var(--space-md); flex-wrap: wrap; }
.form-group-half { flex: 1; min-width: 140px; }
.form-group-checkbox { display: flex; align-items: flex-end; padding-bottom: 0.2rem; }
.checkbox-label { display: flex; align-items: center; gap: var(--space-xs); font-weight: normal !important; font-size: 0.92rem; cursor: pointer; }
.checklist-editor-list { list-style: none; margin: 0 0 var(--space-sm); padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.checklist-editor-item { display: flex; align-items: center; gap: var(--space-xs); }
.checklist-editor-input { flex: 1; }
.checklist-add-row { display: flex; gap: var(--space-xs); align-items: center; }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-start; margin-top: var(--space-md); }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
