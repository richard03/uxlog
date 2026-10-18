<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.nav.projects }}</h1>
      <div class="header-actions">
        <AppButton variant="tertiary" @click="showImport = true">{{ t.project.import }}</AppButton>
        <AppButton variant="primary" @click="openForm()">{{ t.project.add }}</AppButton>
      </div>
    </header>

    <div v-if="projectCards.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="project-list entity-list" role="list">
      <EntityCard
        v-for="p in projectCards"
        :key="p.id"
        :to="{ name: 'project', params: { id: p.id } }"
        :entity-id="p.id"
        :dnd="dnd"
        :left-border-color="p.color || ''"
      >
        <div class="card-header">
          <h3 class="card-title"><ProjectColorTag :color="p.color" />{{ p.name || t.project.name }}</h3>
        </div>
        <div class="card-meta">
          <AppBadge>{{ t.project.priority }}: {{ priorityLabel(p.priority) }}</AppBadge>
          <AppBadge>{{ t.project.scopeLabel }}: {{ scopeLabel(p.scope) }}</AppBadge>
          <AppBadge :variant="isActivityOverdue(p) ? 'badge-warning' : ''">{{ t.project.lastActivity }}: {{ formatDate(p.lastWorkedAt) }}</AppBadge>
          <AppBadge
            v-if="p.deadline && deadlineBadgeLabel(p.deadline)"
            :variant="deadlineBadgeClass(p.deadline)"
          >{{ t.project.deadline }}: {{ formatCalendarDate(p.deadline) }} – {{ deadlineBadgeLabel(p.deadline) }}</AppBadge>
          <AppBadge v-if="getUncheckedCount(p.id) > 0" variant="badge-info">
            {{ t.project.uncheckedItems(getUncheckedCount(p.id)) }}
          </AppBadge>
          <AppBadge v-if="projectDelayed(p)" variant="badge-warning">
            {{ t.project.delayed }}
          </AppBadge>
          <router-link
            v-if="p.taskBadge.count > 0"
            class="project-list__tasks-link"
            :to="tasksRouteForProject(p)"
            :aria-label="t.project.incompleteTasksAria(p.taskBadge.count, p.taskBadge.overdueCount)"
            @click.stop
          >
            <AppBadge :variant="p.taskBadge.overdueCount > 0 ? 'badge-danger' : ''">
              {{ t.project.incompleteTasksTag(p.taskBadge.count) }}
            </AppBadge>
          </router-link>
        </div>
      </EntityCard>
    </ul>

    <section v-if="deletedProjects.length" class="deleted-projects" aria-labelledby="deleted-projects-heading">
      <h2 id="deleted-projects-heading" class="deleted-projects-title">{{ t.history.deletedProjects }}</h2>
      <ul class="deleted-projects-list" role="list">
        <li v-for="d in deletedProjects" :key="d.projectId" class="deleted-projects-item">
          <span class="deleted-projects-name">{{ d.name || t.project.name }}</span>
          <span class="deleted-projects-date">{{ t.history.deletedAt(formatStatusBarDateTime(d.at)) }}</span>
          <AppButton variant="secondary" size="sm" @click="restoreProject(d.projectId)">{{ t.history.restore }}</AppButton>
        </li>
      </ul>
    </section>

    <ImportModal
      v-if="showImport"
      @close="showImport = false"
      @imported="handleImported"
    />

    <Modal v-if="showForm" :title="editing ? t.project.edit : t.project.add" @close="closeForm">
      <form @submit.prevent="saveProject">
        <FormInput v-model="form.name" :label="t.project.name" control-id="project-name" required />
        <FormSelect
          v-model="form.scope"
          :label="t.project.scope"
          control-id="project-scope"
          :options="[
            { value: 'small', label: t.scope.small },
            { value: 'medium', label: t.scope.medium },
            { value: 'large', label: t.scope.large },
          ]"
        />
        <FormSelect
          v-model="form.priority"
          :label="t.project.priority"
          control-id="project-priority"
          :options="[
            { value: 'high', label: t.priority.high },
            { value: 'medium', label: t.priority.medium },
            { value: 'low', label: t.priority.low },
          ]"
        />
        <FormInput v-model="form.deadline" :label="t.project.deadlineLabel" type="date" control-id="project-deadline" />
        <FormGroup :label="t.project.color">
          <ColorSwatchPicker v-model="form.color" :label="t.project.color" />
        </FormGroup>
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
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useConfig } from '../composables/useConfig.js'
import { formatDate, formatCalendarDate, formatStatusBarDateTime } from '../utils/formatDate.js'
import { showToast } from '../composables/useToast.js'
import { useDeadline } from '../composables/useDeadline.js'
import { summarizeIncompleteTasksForProjectBadge } from '../lib/tasksDisplay.js'
import { useRouter } from 'vue-router'
import Modal from '../components/Modal.vue'
import ImportModal from '../components/ImportModal.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'
import EntityCard from '../components/EntityCard.vue'
import AppBadge from '../components/AppBadge.vue'
import { FormGroup, FormInput, FormSelect, FormActions } from '../components/form'
import AppButton from '../components/AppButton.vue'

const store = useStore()
const { t, tPath } = useI18n()
const { daysRemaining, countUncheckedItems, isProjectDelayed, todayISO, addDays, isActivityOverdue } = useDeadline()
const config = useConfig()
const router = useRouter()

const showForm = ref(false)
const showImport = ref(false)
const editing = ref(null)

const form = ref({
  name: '',
  scope: 'medium',
  priority: 'medium',
  color: '',
  deadline: '',
})

const projects = computed(() => store.getProjects())

/** Smazané projekty, které lze obnovit z historie změn. */
const deletedProjects = computed(() => store.getDeletedProjects())

function restoreProject(projectId) {
  if (store.restoreDeletedProject(projectId)) showToast(t.history.restored)
}

/**
 * Projekty s předpočítaným shrnutím úkolů pro štítek (jedna hodnota na kartu).
 */
const projectCards = computed(() =>
  projects.value.map((p) => ({
    ...p,
    taskBadge: summarizeIncompleteTasksForProjectBadge(store.getTasks(p.id)),
  })),
)

const dnd = useDraggableList(() => projectCards.value, (orderedIds) => store.reorderProjects(orderedIds))

/**
 * Cíl odkazu na sekci Úkoly; při prošlých úkolech zapne filtr přes query.
 * @param {{ id: string, taskBadge: { overdueCount: number } }} projectCard
 * @returns {{ name: string, params: { id: string }, query?: { overdue: string } }}
 */
function tasksRouteForProject(projectCard) {
  const loc = { name: 'tasks', params: { id: projectCard.id } }
  if (projectCard.taskBadge.overdueCount > 0) loc.query = { overdue: '1' }
  return loc
}

function scopeLabel(s) {
  return tPath(`scope.${s}`) || s
}

function priorityLabel(p) {
  return tPath(`priority.${p}`) || p
}

function deadlineBadgeLabel(deadline) {
  const dr = daysRemaining(deadline)
  if (dr === null) return null
  if (dr < 0) return t.project.daysOverdue(Math.abs(dr))
  if (dr === 0) return t.project.daysRemainingToday
  return t.project.daysRemaining(dr)
}

function deadlineBadgeClass(deadline) {
  const dr = daysRemaining(deadline)
  if (dr === null) return ''
  if (dr < 0) return 'badge-danger'
  if (dr <= 7) return 'badge-warning'
  return ''
}

function getUncheckedCount(projectId) {
  return countUncheckedItems(store.getAllActivities(projectId))
}

function projectDelayed(project) {
  return isProjectDelayed(project, store.getAllActivities(project.id), config.getTemplateDurationDays)
}

function defaultDeadlineForNewProject() {
  const templates = config.getEffectiveTemplates().filter((t) => t.createOnNewProject)
  const totalDays = templates.reduce((sum, t) => sum + (t.defaultDurationDays || 0), 0)
  return totalDays > 0 ? addDays(todayISO(), totalDays) : ''
}

function openForm(project = null) {
  editing.value = project
  form.value = project
    ? { name: project.name, scope: project.scope, priority: project.priority, color: project.color || '', deadline: project.deadline || '' }
    : { name: '', scope: 'medium', priority: 'medium', color: '', deadline: defaultDeadlineForNewProject() }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function handleImported({ projectId }) {
  showImport.value = false
  alert(t.import.success)
  if (projectId) {
    router.push({ name: 'project', params: { id: projectId } })
  }
}

function saveProject() {
  const formData = { name: form.value.name, scope: form.value.scope, priority: form.value.priority, color: form.value.color, deadline: form.value.deadline }
  const projectToEdit = editing.value
  const isEdit = !!projectToEdit && store.state.projects?.some((p) => p.id === projectToEdit.id)
  console.log('[UXLog] saveProject, editing:', !!projectToEdit, 'projekt v seznamu:', isEdit, 'form:', formData, 'projektů před:', store.state.projects?.length ?? 0)
  if (isEdit) {
    store.updateProject(projectToEdit.id, formData)
  } else {
    store.addProject(formData)
  }
  console.log('[UXLog] saveProject dokončeno, projektů po:', store.state.projects?.length ?? 0)
  closeForm()
}

</script>

<style scoped>
.deleted-projects {
  margin-top: var(--space-xl);
}

.deleted-projects-title {
  font-size: 1rem;
  margin: 0 0 var(--space-sm);
  color: var(--text-muted);
}

.deleted-projects-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.deleted-projects-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.deleted-projects-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.deleted-projects-date {
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.page-header {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.project-list [draggable="true"] { cursor: grab; }
.project-list [draggable="true"]:active { cursor: grabbing; }
.project-list .drag-over { border-color: var(--accent); background: var(--bg-elevated); }
.project-list .dragging { opacity: 0.4; }

.project-list :deep(.card-title) {
  font-size: 1.1rem;
}

/** Odkaz na úkoly uvnitř karty projektu (bez propagace na kartu projektu). */
.project-list__tasks-link {
  display: inline-flex;
  text-decoration: none;
  color: inherit;
  vertical-align: baseline;
  border-radius: var(--radius-sm);
}

.project-list__tasks-link:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
</style>
