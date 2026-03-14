<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.nav.projects }}</h1>
      <div class="header-actions">
        <button type="button" class="btn btn-ghost" @click="showImport = true">
          {{ t.project.import }}
        </button>
        <button type="button" class="btn btn-primary" @click="openForm()">
          {{ t.project.add }}
        </button>
      </div>
    </header>

    <div v-if="projects.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="project-list" role="list">
      <li
        v-for="p in projects"
        :key="p.id"
        class="card"
        :class="{ 'drag-over': dnd.isDragOver(p.id), dragging: dnd.isDragging(p.id) }"
        :style="p.color ? { borderLeftColor: p.color, borderLeftWidth: '4px' } : {}"
        draggable="true"
        @dragstart="dnd.onDragStart($event, p.id)"
        @dragover="dnd.onDragOver($event, p.id)"
        @drop="dnd.onDrop($event, p.id)"
        @dragend="dnd.onDragEnd()"
      >
        <router-link :to="{ name: 'project', params: { id: p.id } }" class="card-link" draggable="false">
          <div class="card-header">
            <h3 class="card-title"><ProjectColorTag :color="p.color" />{{ p.name || t.project.name }}</h3>
          </div>
          <div class="card-meta">
            <span class="badge">{{ t.project.priority }}: {{ priorityLabel(p.priority) }}</span>
            <span class="badge">{{ t.project.scopeLabel }}: {{ scopeLabel(p.scope) }}</span>
            <span
              class="badge"
              :class="{ 'badge-warning': isActivityOverdue(p) }"
            >{{ t.project.lastActivity }}: {{ formatDate(p.lastWorkedAt) }}</span>
            <span
              v-if="p.deadline && deadlineBadgeLabel(p.deadline)"
              class="badge"
              :class="deadlineBadgeClass(p.deadline)"
            >{{ t.project.deadline }}: {{ formatDeadlineDate(p.deadline) }} – {{ deadlineBadgeLabel(p.deadline) }}</span>
            <span v-if="getUncheckedCount(p.id) > 0" class="badge badge-info">
              {{ t.project.uncheckedItems(getUncheckedCount(p.id)) }}
            </span>
            <span v-if="projectDelayed(p)" class="badge badge-warning">
              {{ t.project.delayed }}
            </span>
          </div>
        </router-link>
      </li>
    </ul>

    <ImportModal
      v-if="showImport"
      @close="showImport = false"
      @imported="handleImported"
    />

    <Modal v-if="showForm" :title="editing ? t.project.edit : t.project.add" @close="closeForm">
      <form @submit.prevent="saveProject">
        <div class="form-group">
          <label for="project-name">{{ t.project.name }}</label>
          <input id="project-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="project-scope">{{ t.project.scope }}</label>
          <select id="project-scope" v-model="form.scope">
            <option value="small">{{ t.scope.small }}</option>
            <option value="medium">{{ t.scope.medium }}</option>
            <option value="large">{{ t.scope.large }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="project-priority">{{ t.project.priority }}</label>
          <select id="project-priority" v-model="form.priority">
            <option value="high">{{ t.priority.high }}</option>
            <option value="medium">{{ t.priority.medium }}</option>
            <option value="low">{{ t.priority.low }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="project-deadline">{{ t.project.deadlineLabel }}</label>
          <input id="project-deadline" type="date" v-model="form.deadline" />
        </div>
        <div class="form-group">
          <label>{{ t.project.color }}</label>
          <ColorSwatchPicker v-model="form.color" :label="t.project.color" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">
            {{ t.common.cancel }}
          </button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { useConfig } from '../composables/useConfig.js'
import { formatDate } from '../utils/formatDate.js'
import { isActivityOverdue } from '../lib/activity.js'
import { daysRemaining, countUncheckedItems, isProjectDelayed, todayISO, addDays } from '../lib/deadline.js'
import { useRouter } from 'vue-router'
import Modal from '../components/Modal.vue'
import ImportModal from '../components/ImportModal.vue'
import { useDraggableList } from '../composables/useDraggableList.js'
import ProjectColorTag from '../components/ProjectColorTag.vue'
import ColorSwatchPicker from '../components/ColorSwatchPicker.vue'

const store = useStore()
const { t, tPath } = useI18n()
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
const dnd = useDraggableList(() => projects.value, (orderedIds) => store.reorderProjects(orderedIds))

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

function formatDeadlineDate(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
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

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.project-list .card-link {
  display: block;
}
</style>
