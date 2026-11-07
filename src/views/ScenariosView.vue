<template>
  <div class="container" v-if="project">
    <ProjectPageHeader
      :breadcrumbs="breadcrumbs"
      :color="project?.color"
      :title="t.sections.scenarios">
      <template #actions>
        <AppButton variant="secondary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <ExportButton :get-yaml="() => store.exportSectionData(projectId, 'scenarios')" :filename="t.sections.scenarios" />
      </template>
    </ProjectPageHeader>

    <ColumnHeading :title="t.sections.scenarios">
      <template #actions>
        <AppButton variant="primary" size="sm" @click="openForm()">{{ t.scenario.add }}</AppButton>
      </template>
    </ColumnHeading>

    <div class="filter-bar">
      <div class="filter-search">
        <input type="search" v-model="filterText" :placeholder="t.filter.search" class="filter-search-input" :aria-label="t.filter.search" />
        <button v-if="filterText" class="filter-search-clear" type="button" :aria-label="t.filter.clearSearch" @click="filterText = ''">&#x2715;</button>
      </div>
      <div class="filter-bar-group" role="group" :aria-label="t.filter.type">
        <button class="filter-badge" :class="{ 'filter-badge--active': filterMain }" type="button" @click="filterMain = !filterMain">{{ t.scenario.scenarioType.main }} ({{ countMain }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterSecondary }" type="button" @click="filterSecondary = !filterSecondary">{{ t.scenario.scenarioType.secondary }} ({{ countSecondary }})</button>
        <button class="filter-badge" :class="{ 'filter-badge--active': filterError }" type="button" @click="filterError = !filterError">{{ t.scenario.scenarioType.error }} ({{ countError }})</button>
      </div>
    </div>

    <div v-if="visibleItems.length === 0" class="empty-state">
      <template v-if="items.length === 0">
        <p>{{ t.common.empty }}</p>
        <p>{{ t.common.emptyHint }}</p>
      </template>
      <template v-else>
        <p>{{ t.filter.emptyFiltered }}</p>
        <p>{{ t.filter.emptyFilteredHint }}</p>
      </template>
    </div>

    <ul v-else class="entity-list" role="list">
      <EntityCard
        v-for="s in visibleItems"
        :key="s.id"
        :to="{ name: 'scenarioDetail', params: { id: projectId, scenarioId: s.id } }"
        :entity-id="s.id"
        :dnd="dnd"
      >
        <div class="card-badges">
          <AppBadge v-if="s.code" variant="badge-accent">{{ s.code }}</AppBadge>
          <AppBadge>{{ tPath(`scenario.scenarioType.${s.type || 'main'}`) }}</AppBadge>
          <AppBadge
            :variant="getEntityCompleteness(s, 'scenario').filled === getEntityCompleteness(s, 'scenario').total ? 'completeness-done' : 'completeness'"
            :aria-label="t.completeness.ariaLabel(getEntityCompleteness(s, 'scenario').filled, getEntityCompleteness(s, 'scenario').total)"
          >{{ getEntityCompleteness(s, 'scenario').filled }}/{{ getEntityCompleteness(s, 'scenario').total }}</AppBadge>
        </div>
        <h3 class="card-title">{{ s.name || t.scenario.name }}</h3>
        <p v-if="s.description" class="card-desc">{{ s.description }}</p>
      </EntityCard>
    </ul>

    <ImportModal v-if="showImport" :project-id="projectId" @close="showImport = false" @imported="() => { showImport = false }" />

    <Modal v-if="showForm" :title="t.scenario.add" @close="closeForm">
      <form @submit.prevent="save">
        <FormInput v-model="form.code" :label="t.scenario.code" control-id="s-code" />
        <FormInput v-model="form.name" :label="t.scenario.name" control-id="s-name" required />
        <FormSelect
          v-model="form.type"
          :label="t.scenario.type"
          control-id="s-type"
          :options="[
            { value: 'main', label: t.scenario.scenarioType.main },
            { value: 'secondary', label: t.scenario.scenarioType.secondary },
            { value: 'error', label: t.scenario.scenarioType.error },
          ]"
        />
        <FormTextarea v-model="form.description" :label="t.scenario.description" control-id="s-desc" />
        <FormActions>
          <AppButton variant="secondary" @click="closeForm">{{ t.common.cancel }}</AppButton>
          <AppButton variant="primary" native-type="submit">{{ t.common.save }}</AppButton>
        </FormActions>
      </form>
    </Modal>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import ColumnHeading from '../components/ColumnHeading.vue'
import ProjectPageHeader from '../components/ProjectPageHeader.vue'
import Modal from '../components/Modal.vue'
import ImportModal from '../components/ImportModal.vue'
import ExportButton from '../components/ExportButton.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import { useEntityHelpers } from '../composables/useEntityHelpers.js'
import { FormInput, FormTextarea, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'
import { filterByAnyActiveBranch } from '../lib/listFilters.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()
const { generateNextCode, getCodePrefix, getEntityCompleteness } = useEntityHelpers()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getScenarios(projectId.value))
const filterMain = ref(false)
const filterSecondary = ref(false)
const filterError = ref(false)
const filterText = ref('')
const countMain = computed(() => items.value.filter(s => (s.type || 'main') === 'main').length)
const countSecondary = computed(() => items.value.filter(s => s.type === 'secondary').length)
const countError = computed(() => items.value.filter(s => s.type === 'error').length)
const visibleItems = computed(() => {
  const base = filterByAnyActiveBranch(items.value, [
    { active: filterMain.value, match: (s) => (s.type || 'main') === 'main' },
    { active: filterSecondary.value, match: (s) => s.type === 'secondary' },
    { active: filterError.value, match: (s) => s.type === 'error' },
  ])
  const q = filterText.value.toLowerCase().trim()
  if (!q) return base
  return base.filter(s => [s.code, s.name, s.description, t.scenario.scenarioType[s.type || 'main']].filter(Boolean).join(' ').toLowerCase().includes(q))
})
const dnd = useDraggableList(() => items.value, (orderedIds) => store.reorderEntities('scenarios', projectId.value, orderedIds))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.scenarios },
])

const showForm = ref(false)
const showImport = ref(false)
const form = ref({ code: '', name: '', type: 'main', description: '' })

/**
 * Otevře formulář pro přidání nového scénáře.
 */
function openForm() {
  form.value = {
    code: generateNextCode(getCodePrefix('scenario'), items.value),
    name: '',
    type: 'main',
    description: '',
  }
  showForm.value = true
}

/**
 * Zavře formulář pro přidání scénáře.
 */
function closeForm() {
  showForm.value = false
}

/**
 * Uloží nový scénář a zavře formulář.
 */
function save() {
  store.addScenario(projectId.value, form.value)
  closeForm()
}
</script>

