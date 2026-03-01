<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">
        {{ t.common.back }}
      </router-link>
      <div class="header-row">
        <h1>{{ t.sections.goals }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">
          {{ t.goal.add }}
        </button>
      </div>
    </header>

    <div v-if="goals.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="g in goals" :key="g.id" class="card">
        <div class="card-body">
          <span v-if="g.code" class="badge badge-accent">{{ g.code }}</span>
          <h3 class="card-title">{{ g.name || t.goal.name }}</h3>
          <p v-if="g.description" class="card-desc">{{ g.description }}</p>
          <p v-if="g.metrics" class="card-meta">{{ t.goal.metrics }}: {{ g.metrics }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(g)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(g)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.goal.edit : t.goal.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="goal-code">{{ t.goal.code }}</label>
          <input id="goal-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="goal-name">{{ t.goal.name }}</label>
          <input id="goal-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="goal-desc">{{ t.goal.description }}</label>
          <textarea id="goal-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="goal-metrics">{{ t.goal.metrics }}</label>
          <textarea id="goal-metrics" v-model="form.metrics" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="showConfirm"
      :title="t.goal.delete"
      :message="t.goal.deleteConfirm"
      @confirm="doDelete"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { generateNextCode } from '../lib/code.js'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const goals = computed(() => store.getGoals(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({ code: '', name: '', description: '', metrics: '' })

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { code: generateNextCode('GOL', goals.value), name: '', description: '', metrics: '' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) {
    store.updateGoal(editing.value.id, form.value)
  } else {
    store.addGoal(projectId.value, form.value)
  }
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deleteGoal(deleteId.value)
  showConfirm.value = false
  deleteId.value = null
}
</script>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.back-link {
  width: fit-content;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-md);
}

.card-body {
  flex: 1;
}

.card-title {
  margin: var(--space-xs) 0;
  font-size: 1rem;
}

.card-desc, .card-meta {
  margin: var(--space-xs) 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.card-actions {
  display: flex;
  gap: var(--space-xs);
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
