<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <Breadcrumb :items="breadcrumbs" />
      <div class="header-row">
        <h1>{{ t.sections.requirements }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.requirement.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="r in items" :key="r.id" class="card card-clickable">
        <router-link :to="{ name: 'requirementDetail', params: { id: projectId, requirementId: r.id } }" class="card-body">
          <span v-if="r.code" class="badge badge-accent">{{ r.code }}</span>
          <span class="badge">{{ tPath(`moscow.${r.priority}`) }}</span>
          <h3 class="card-title">{{ r.name || t.requirement.name }}</h3>
          <p v-if="r.description" class="card-desc">{{ r.description }}</p>
        </router-link>
      </li>
    </ul>

    <Modal v-if="showForm" :title="t.requirement.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="r-code">{{ t.requirement.code }}</label>
          <input id="r-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="r-name">{{ t.requirement.name }}</label>
          <input id="r-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="r-moscow">{{ t.requirement.priority }}</label>
          <select id="r-moscow" v-model="form.priority">
            <option value="must">{{ t.moscow.must }}</option>
            <option value="should">{{ t.moscow.should }}</option>
            <option value="could">{{ t.moscow.could }}</option>
            <option value="wont">{{ t.moscow.wont }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="r-desc">{{ t.requirement.description }}</label>
          <textarea id="r-desc" v-model="form.description" />
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
import { generateNextCode } from '../lib/code.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getRequirements(projectId.value))

const breadcrumbs = computed(() => [
  { label: t.nav.projects, to: { name: 'projects' } },
  { label: project.value?.name ?? '…', to: { name: 'project', params: { id: projectId.value } } },
  { label: t.sections.requirements },
])

const showForm = ref(false)
const form = ref({ code: '', name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' })

function openForm() {
  form.value = { code: generateNextCode('REQ', items.value), name: '', description: '', motivation: '', priority: 'could', wontHaveExplanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addRequirement(projectId.value, form.value)
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
