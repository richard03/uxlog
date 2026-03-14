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
        <AppBadge :variant="`group-${template.group}`" pill>{{ t.config.groupLabels[template.group] || template.group }}</AppBadge>
      </div>
    </header>

    <section class="config-section" aria-labelledby="template-form-heading">
      <h2 id="template-form-heading" class="visually-hidden">{{ t.config.editTemplate }}</h2>

      <form @submit.prevent="saveTemplate" class="template-form">
        <FormInput v-model="form.name" :label="t.config.templateName" control-id="tpl-name" required />
        <FormSelect
          v-model="form.group"
          :label="t.config.templateGroup"
          control-id="tpl-group"
          :options="Object.entries(t.config.groupLabels || {}).map(([key, label]) => ({ value: key, label }))"
        />
        <FormTextarea v-model="form.description" :label="t.config.templateDescription" control-id="tpl-desc" :rows="3" />
        <div class="form-group form-group-row">
          <div class="form-group-half">
            <FormInput v-model.number="form.sortOrder" :label="t.config.templateSortOrder" type="number" control-id="tpl-sort" />
          </div>
          <div class="form-group-half">
            <FormInput
              v-model.number="form.defaultDurationDays"
              :label="t.config.templateDefaultDuration"
              type="number"
              min="1"
              control-id="tpl-duration"
              :placeholder="t.config.templateDefaultDurationPlaceholder"
            />
          </div>
        </div>
        <FormCheckbox v-model="form.createOnNewProject" :label="t.config.createOnNewProject" />

        <FormGroup :label="t.config.checklist">
          <ul class="checklist-editor-list" role="list">
            <li v-for="(item, idx) in form.checklist" :key="item.id" class="checklist-editor-item">
              <input
                v-model="item.label"
                class="form-control checklist-editor-input"
                :placeholder="t.config.checklistItemPlaceholder"
              />
              <AppButton variant="tertiary" size="sm" :aria-label="t.config.removeChecklistItem" @click="removeChecklistItem(idx)">✕</AppButton>
            </li>
          </ul>
          <div class="checklist-add-row">
            <input
              v-model="newChecklistLabel"
              class="form-control checklist-editor-input"
              :placeholder="t.config.checklistItemPlaceholder"
              @keydown.enter.prevent="addChecklistItem"
            />
            <AppButton variant="secondary" size="sm" @click="addChecklistItem">{{ t.config.addChecklistItem }}</AppButton>
          </div>
        </FormGroup>

        <FormActions>
          <AppButton variant="secondary" @click="goBack">{{ t.common.back }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
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
import AppBadge from '../components/AppBadge.vue'
import { FormGroup, FormInput, FormTextarea, FormSelect, FormCheckbox, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

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
  defaultDurationDays: null,
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
    form.defaultDurationDays = tpl.defaultDurationDays ?? null
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
    defaultDurationDays: form.defaultDurationDays || undefined,
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
.header-row { gap: var(--space-md); flex-wrap: wrap; }
.header-row h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
.header-meta { margin-top: var(--space-sm); }
.template-form { max-width: 36rem; }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: var(--space-xs); }
.checklist-editor-list { list-style: none; margin: 0 0 var(--space-sm); padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.checklist-editor-item { display: flex; align-items: center; gap: var(--space-xs); }
.checklist-editor-input { flex: 1; }
.checklist-add-row { display: flex; gap: var(--space-xs); align-items: center; }
.form-actions { justify-content: flex-start; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
