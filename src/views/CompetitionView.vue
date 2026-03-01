<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-row">
        <h1>{{ t.sections.competition }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.competition.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="c in items" :key="c.id" class="card">
        <div class="card-body">
          <h3 class="card-title">{{ c.name || t.competition.name }}</h3>
          <p v-if="c.description" class="card-desc">{{ c.description }}</p>
          <p v-if="c.strengths"><strong>{{ t.competition.strengths }}:</strong> {{ c.strengths }}</p>
          <p v-if="c.weaknesses"><strong>{{ t.competition.weaknesses }}:</strong> {{ c.weaknesses }}</p>
          <p v-if="c.inspiration"><strong>{{ t.competition.inspiration }}:</strong> {{ c.inspiration }}</p>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost" @click="openForm(c)">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete(c)">{{ t.common.delete }}</button>
        </div>
      </li>
    </ul>

    <Modal v-if="showForm" :title="editing ? t.competition.edit : t.competition.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="c-name">{{ t.competition.name }}</label>
          <input id="c-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="c-desc">{{ t.competition.description }}</label>
          <textarea id="c-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="c-strengths">{{ t.competition.strengths }}</label>
          <textarea id="c-strengths" v-model="form.strengths" />
        </div>
        <div class="form-group">
          <label for="c-weaknesses">{{ t.competition.weaknesses }}</label>
          <textarea id="c-weaknesses" v-model="form.weaknesses" />
        </div>
        <div class="form-group">
          <label for="c-inspiration">{{ t.competition.inspiration }}</label>
          <textarea id="c-inspiration" v-model="form.inspiration" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog v-if="showConfirm" :title="t.competition.delete" :message="t.competition.deleteConfirm" @confirm="doDelete" @cancel="showConfirm = false" />
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
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getCompetitions(projectId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const editing = ref(null)
const deleteId = ref(null)
const form = ref({ name: '', description: '', strengths: '', weaknesses: '', inspiration: '' })

function openForm(item = null) {
  editing.value = item
  form.value = item ? { ...item } : { name: '', description: '', strengths: '', weaknesses: '', inspiration: '' }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function save() {
  if (editing.value) store.updateCompetition(editing.value.id, form.value)
  else store.addCompetition(projectId.value, form.value)
  closeForm()
}

function confirmDelete(item) {
  deleteId.value = item.id
  showConfirm.value = true
}

function doDelete() {
  if (deleteId.value) store.deleteCompetition(deleteId.value)
  showConfirm.value = false
  deleteId.value = null
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: fit-content; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-actions { display: flex; gap: var(--space-xs); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
