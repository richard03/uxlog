<template>
  <div class="container" v-if="project && scenario">
    <header class="page-header">
      <router-link :to="{ name: 'scenarios', params: { id: projectId } }" class="back-link">{{ t.common.back }}</router-link>
      <div class="header-title-row">
        <h1>{{ scenario.name || t.scenario.name }}</h1>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" @click="openForm">{{ t.common.edit }}</button>
          <button type="button" class="btn btn-ghost" @click="confirmDelete">{{ t.common.delete }}</button>
        </div>
      </div>
      <div class="header-meta">
        <span v-if="scenario.code" class="badge badge-accent">{{ scenario.code }}</span>
        <span class="badge">{{ tPath(`scenario.scenarioType.${scenario.type || 'main'}`) }}</span>
        <span v-if="scenario.moscowRating" class="badge">{{ tPath(`moscow.${scenario.moscowRating}`) }}</span>
      </div>
    </header>

    <section class="detail-section">
      <h2 class="visually-hidden">{{ t.scenario.label }}</h2>
      <dl class="detail-list">
        <div v-if="scenario.description" class="detail-item">
          <dt>{{ t.scenario.description }}</dt>
          <dd>{{ scenario.description }}</dd>
        </div>
        <div v-if="scenario.frequency" class="detail-item">
          <dt>{{ t.scenario.frequency }}</dt>
          <dd>{{ scenario.frequency }}</dd>
        </div>
        <div v-if="scenario.value" class="detail-item">
          <dt>{{ t.scenario.value }}</dt>
          <dd>{{ scenario.value }}</dd>
        </div>
      </dl>
    </section>

    <Modal v-if="showForm" :title="t.scenario.edit" @close="closeForm">
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="sd-code">{{ t.scenario.code }}</label>
          <input id="sd-code" v-model="form.code" />
        </div>
        <div class="form-group">
          <label for="sd-name">{{ t.scenario.name }}</label>
          <input id="sd-name" v-model="form.name" required />
        </div>
        <div class="form-group">
          <label for="sd-type">{{ t.scenario.type }}</label>
          <select id="sd-type" v-model="form.type">
            <option value="main">{{ t.scenario.scenarioType.main }}</option>
            <option value="secondary">{{ t.scenario.scenarioType.secondary }}</option>
            <option value="error">{{ t.scenario.scenarioType.error }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sd-desc">{{ t.scenario.description }}</label>
          <textarea id="sd-desc" v-model="form.description" />
        </div>
        <div class="form-group">
          <label for="sd-frequency">{{ t.scenario.frequency }}</label>
          <input id="sd-frequency" v-model="form.frequency" />
        </div>
        <div class="form-group">
          <label for="sd-value">{{ t.scenario.value }}</label>
          <input id="sd-value" v-model="form.value" />
        </div>
        <div class="form-group">
          <label for="sd-moscow">{{ t.scenario.moscowRating }}</label>
          <select id="sd-moscow" v-model="form.moscowRating">
            <option value="must">{{ t.moscow.must }}</option>
            <option value="should">{{ t.moscow.should }}</option>
            <option value="could">{{ t.moscow.could }}</option>
            <option value="wont">{{ t.moscow.wont }}</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">{{ t.common.cancel }}</button>
          <button type="submit" class="btn btn-primary">{{ t.common.save }}</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="showConfirm"
      :title="t.scenario.delete"
      :message="t.scenario.deleteConfirm"
      @confirm="doDelete"
      @cancel="showConfirm = false"
    />
  </div>
  <div v-else-if="project && !scenario" class="container">
    <p>{{ t.common.loading }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../composables/useStore.js'
import { useI18n } from '../composables/useI18n.js'
import Modal from '../components/Modal.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const { t, tPath } = useI18n()

const projectId = computed(() => route.params.id)
const scenarioId = computed(() => route.params.scenarioId)
const project = computed(() => store.getProject(projectId.value))
const scenario = computed(() => store.getScenario(scenarioId.value))

const showForm = ref(false)
const showConfirm = ref(false)
const form = ref({
  code: '',
  name: '',
  type: 'main',
  description: '',
  frequency: '',
  value: '',
  moscowRating: 'could',
})

/**
 * Naplní formulář aktuálními hodnotami scénáře.
 */
function fillForm() {
  if (scenario.value) {
    form.value = {
      code: scenario.value.code ?? '',
      name: scenario.value.name ?? '',
      type: scenario.value.type ?? 'main',
      description: scenario.value.description ?? '',
      frequency: scenario.value.frequency ?? '',
      value: scenario.value.value ?? '',
      moscowRating: scenario.value.moscowRating ?? 'could',
    }
  }
}

watch(scenario, fillForm, { immediate: true })

/**
 * Otevře formulář pro úpravu scénáře.
 */
function openForm() {
  fillForm()
  showForm.value = true
}

/**
 * Zavře formulář pro úpravu.
 */
function closeForm() {
  showForm.value = false
}

/**
 * Uloží úpravy scénáře.
 */
function save() {
  if (scenario.value) {
    store.updateScenario(scenario.value.id, form.value)
    closeForm()
  }
}

/**
 * Zobrazí dialog pro potvrzení smazání.
 */
function confirmDelete() {
  showConfirm.value = true
}

/**
 * Smaže scénář a přesměruje na seznam scénářů.
 */
function doDelete() {
  if (scenario.value) {
    store.deleteScenario(scenario.value.id)
    router.push({ name: 'scenarios', params: { id: projectId.value } })
  }
  showConfirm.value = false
}
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.header-title-row h1 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-xs);
}

.back-link {
  display: inline-block;
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.detail-section {
  margin-top: var(--space-lg);
}

.detail-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-item {
  margin-bottom: var(--space-md);
}

.detail-item dt {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-xs);
}

.detail-item dd {
  margin: 0;
  color: var(--text-muted);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-md);
}
</style>
