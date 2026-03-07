<template>
  <div class="container">
    <header class="page-header">
      <h1>{{ t.nav.projects }}</h1>
      <div class="header-actions">
        <button type="button" class="btn btn-ghost" @click="showImport = true">
          {{ t.project.import }}
        </button>
        <button type="button" class="btn btn-primary" @click="openForm">
          {{ t.project.add }}
        </button>
      </div>
    </header>

    <div v-if="projects.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <p>{{ t.common.emptyHint }}</p>
    </div>

    <ul v-else class="project-list" role="list">
      <li v-for="p in projects" :key="p.id" class="card">
        <router-link :to="{ name: 'project', params: { id: p.id } }" class="card-link">
          <div class="card-header">
            <h3 class="card-title">{{ p.name || t.project.name }}</h3>
          </div>
          <div class="card-meta">
            <span class="badge">{{ t.project.priority }}: {{ priorityLabel(p.priority) }}</span>
            <span class="badge">{{ t.project.scopeLabel }}: {{ scopeLabel(p.scope) }}</span>
            <span
              class="badge"
              :class="{ 'badge-warning': isActivityOverdue(p) }"
            >{{ t.project.lastActivity }}: {{ formatDate(p.lastWorkedAt) }}</span>
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
import { ref, computed } from 'vue'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import { formatDate } from '../utils/formatDate.js'
import { isActivityOverdue } from '../lib/activity.js'
import { useRouter } from 'vue-router'
import Modal from '../components/Modal.vue'
import ImportModal from '../components/ImportModal.vue'

const store = useStore()
const { t, tPath } = useI18n()
const router = useRouter()

const showForm = ref(false)
const showImport = ref(false)
const editing = ref(null)

const form = ref({
  name: '',
  scope: 'medium',
  priority: 'medium',
})

const projects = computed(() => store.state.projects || [])

function scopeLabel(s) {
  return tPath(`scope.${s}`) || s
}

function priorityLabel(p) {
  return tPath(`priority.${p}`) || p
}

function openForm(project = null) {
  editing.value = project
  form.value = project
    ? { name: project.name, scope: project.scope, priority: project.priority }
    : { name: '', scope: 'medium', priority: 'medium' }
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
  const formData = { name: form.value.name, scope: form.value.scope, priority: form.value.priority }
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.header-actions {
  display: flex;
  gap: var(--space-xs);
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

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

.card-date {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.project-list .card-link {
  display: block;
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
