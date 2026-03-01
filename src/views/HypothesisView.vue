<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <h1>{{ t.sections.hypothesis }}</h1>
      <button type="button" class="btn btn-primary" @click="openForm()">{{ t.hypothesis.add }}</button>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
      <button type="button" class="btn btn-primary" @click="openForm()">{{ t.hypothesis.add }}</button>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="h in items" :key="h.id" class="card">
        <div class="card-body">
          <span v-if="h.code" class="badge badge-accent">{{ h.code }}</span>
          <h3 class="card-title">{{ h.name || t.hypothesis.name }}</h3>
          <p v-if="h.description" class="card-desc">{{ h.description }}</p>
          <span class="badge">{{ tPath(`hypothesisStatus.${h.status}`) }}</span>
          <p v-if="h.explanation" class="card-meta">{{ t.hypothesis.explanation }}: {{ h.explanation }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(h)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(h)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.hypothesis.edit : t.hypothesis.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="h-code">{{ t.hypothesis.code }}</label>
          <input id="h-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="h-name">{{ t.hypothesis.name }}</label>
          <input id="h-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="h-desc">{{ t.hypothesis.description }}</label>
          <textarea id="h-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="h-status">{{ t.hypothesis.status }}</label>
          <select id="h-status" v-model="form.status">
            <option value="untested">{{ t.hypothesisStatus.untested }}</option>
            <option value="tested">{{ t.hypothesisStatus.tested }}</option>
            <option value="refuted">{{ t.hypothesisStatus.refuted }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="h-explanation">{{ t.hypothesis.explanation }}</label>
          <textarea id="h-explanation" v-model="form.explanation" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.hypothesis.delete" :message="t.hypothesis.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getHypotheses(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({ code: '', name: '', description: '', status: 'untested', explanation: '' })

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { code: '', name: '', description: '', status: 'untested', explanation: '' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) store.updateHypothesis(editing.value.id, form.value)
  else store.addHypothesis(projectId.value, form.value)
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deleteHypothesis(deleteId.value)
  showConfirm.value = false
  deleteId.value = null
}
</script>

<style scoped>
.page-header { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: 100%; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-meta { margin-top: var(--space-sm); font-size: 0.9rem; }
.card-actions { display: flex; gap: var(--space-xs); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
