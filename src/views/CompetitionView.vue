<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.competition }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.competition.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="c in items" :key="c.id" class="card card-clickable">
        <router-link :to="{ name: 'competitionDetail', params: { id: projectId, competitionId: c.id } }" class="card-body">
          <h3 class="card-title">{{ c.name || t.competition.name }}</h3>
          <p v-if="c.description" class="card-desc">{{ c.description }}</p>
        </router-link>
      </li>
    </ul>

    <Modal v-if="showForm" :title="t.competition.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="c-name">{{ t.competition.name }}</label>
          <input id="c-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="c-desc">{{ t.competition.description }}</label>
          <textarea id="c-desc" v-model="form.description" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import Breadcrumb from '../components/Breadcrumb.vue'

const route = useRoute()
const store = useStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getCompetitions(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.competition },
])

const showForm = ref(false)
const form = ref({ name: '', description: '', strengths: '', weaknesses: '', inspiration: '' })

function openForm() {
  form.value = { name: '', description: '', strengths: '', weaknesses: '', inspiration: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addCompetition(projectId.value, form.value)
  closeForm()
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card-body { flex: 1; text-decoration: none; color: inherit; display: block; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
