<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-row">
        <h1>{{ t.sections.hypothesis }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.hypothesis.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="h in items" :key="h.id" class="card card-clickable">
        <router-link :to="{ name: 'hypothesisDetail', params: { id: projectId, hypothesisId: h.id } }" class="card-body">
          <span v-if="h.code" class="badge badge-accent">{{ h.code }}</span>
          <span class="badge">{{ tPath(`hypothesisStatus.${h.status}`) }}</span>
          <h3 class="card-title">{{ h.name || t.hypothesis.name }}</h3>
          <p v-if="h.description" class="card-desc">{{ h.description }}</p>
        </router-link>
      </li>
    </ul>

    <Modal v-if="showForm" :title="t.hypothesis.add" @close="closeForm">
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
import { generateNextCode } from '../lib/code.js'

const route = useRoute()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const project = computed(() => store.getProject(projectId.value))
const items = computed(() => store.getHypotheses(projectId.value))

const showForm = ref(false)
const form = ref({ code: '', name: '', description: '', status: 'untested', explanation: '' })

function openForm() {
  form.value = { code: generateNextCode('HYP', items.value), name: '', description: '', status: 'untested', explanation: '' }
  showForm.value = true
}

function closeForm() { showForm.value = false }

function save() {
  store.addHypothesis(projectId.value, form.value)
  closeForm()
}
</script>

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: fit-content; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card-body { flex: 1; text-decoration: none; color: inherit; display: block; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
