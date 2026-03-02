<template>
  <div class="container" v-if="project">
    <header class="page-header">
      <router-link :to="{ name: 'project', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-row">
        <h1>{{ t.sections.scenarios }}</h1>
        <button type="button" class="btn btn-primary" @click="openForm()">{{ t.scenario.add }}</button>
      </div>
    </header>

    <div v-if="items.length === 0" class="empty-state">
      <p>{{ t.common.empty }}</p>
    </div>

    <ul v-else class="entity-list" role="list">
      <li v-for="s in items" :key="s.id" class="card card-clickable">
        <router-link :to="{ name: 'scenarioDetail', params: { id: projectId, scenarioId: s.id } }" class="card-body">
          <span v-if="s.code" class="badge badge-accent">{{ s.code }}</span>
          <span class="badge">{{ tPath(`scenario.scenarioType.${s.type || 'main'}`) }}</span>
          <h3 class="card-title">{{ s.name || t.scenario.name }}</h3>
          <p v-if="s.description" class="card-desc">{{ s.description }}</p>
        </router-link>
      </li>
    </ul>

    <Modal v-if="showForm" :title="t.scenario.add" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="s-code">{{ t.scenario.code }}</label>
          <input id="s-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="s-name">{{ t.scenario.name }}</label>
          <input id="s-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="s-type">{{ t.scenario.type }}</label>
          <select id="s-type" v-model="form.type">
            <option value="main">{{ t.scenario.scenarioType.main }}</option>
            <option value="secondary">{{ t.scenario.scenarioType.secondary }}</option>
            <option value="error">{{ t.scenario.scenarioType.error }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="s-desc">{{ t.scenario.description }}</label>
          <textarea id="s-desc" v-model="form.description" />
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
const items = computed(() => store.getScenarios(projectId.value))

const showForm = ref(false)
const form = ref({ code: '', name: '', type: 'main', description: '' })

/**
 * Otevře formulář pro přidání nového scénáře.
 */
function openForm() {
  form.value = {
    code: generateNextCode('SCN', items.value),
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

<style scoped>
.page-header { display: flex; flex-direction: column; gap: var(--space-md); margin-bottom: var(--space-lg); }
.back-link { width: fit-content; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.entity-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-md); }
.card { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
.card-body { flex: 1; }
.card-title { margin: var(--space-xs) 0; font-size: 1rem; }
.card-desc { margin: var(--space-xs) 0; font-size: 0.9rem; color: var(--text-muted); }
.card-clickable .card-body { text-decoration: none; color: inherit; display: block; }
.card-clickable:hover { border-color: var(--accent); }
.form-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; margin-top: var(--space-md); }
</style>
