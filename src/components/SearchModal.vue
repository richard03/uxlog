<template>
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Vyhledávání"
    @keydown.esc="emit('close')"
  >
    <div class="modal search-modal" ref="modalRef">
      <header class="modal-header">
        <h2>{{ t.common.search }}</h2>
        <button
          type="button"
          class="btn btn-ghost icon-btn"
          aria-label="Zavřít"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div class="modal-body">
        <div class="form-group">
          <label for="search-input">{{ t.common.searchPlaceholder }}</label>
          <input
            id="search-input"
            ref="inputRef"
            type="search"
            v-model="query"
            :placeholder="t.common.searchPlaceholder"
            autocomplete="off"
            @keydown.enter.prevent="runSearch"
          />
        </div>
        <div v-if="results" class="search-results">
          <p v-if="!hasResults" class="empty-state">{{ t.common.noResults }}</p>
          <div v-else>
            <SearchResultsSection
              v-if="results.projectIds.length"
              :title="t.project.label"
              :items="projectItems"
              section="project"
              :projectId="(p) => p.id"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.goalIds.length"
              :title="t.goal.label"
              :items="goalItems"
              section="goals"
              :projectId="(g) => g.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.stakeholderIds.length"
              :title="t.stakeholder.label"
              :items="stakeholderItems"
              section="stakeholders"
              :projectId="(s) => s.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.competitionIds.length"
              :title="t.competition.label"
              :items="competitionItems"
              section="competition"
              :projectId="(c) => c.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.hypothesisIds.length"
              :title="t.hypothesis.label"
              :items="hypothesisItems"
              section="hypothesis"
              :projectId="(h) => h.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.personaIds.length"
              :title="t.persona.label"
              :items="personaItems"
              section="personas"
              :projectId="(p) => p.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.scenarioIds.length"
              :title="t.scenario.label"
              :items="scenarioItems"
              section="scenarios"
              :projectId="(s) => s.projectId"
              @close="showSearch = false"
            />
            <SearchResultsSection
              v-if="results.requirementIds.length"
              :title="t.requirement.label"
              :items="requirementItems"
              section="requirements"
              :projectId="(r) => r.projectId"
              @close="showSearch = false"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { useStore } from '../composables/useStore.js'
import SearchResultsSection from './SearchResultsSection.vue'

const emit = defineEmits(['close'])
const router = useRouter()
const { t } = useI18n()
const store = useStore()

const query = ref('')
const results = ref(null)
const inputRef = ref(null)
const modalRef = ref(null)

const hasResults = computed(() => {
  if (!results.value) return false
  const r = results.value
  return r.projectIds.length || r.goalIds.length || r.stakeholderIds.length ||
    r.competitionIds.length || r.hypothesisIds.length || r.personaIds.length ||
    r.scenarioIds.length || r.requirementIds.length
})

const projectItems = computed(() =>
  (results.value?.projectIds || []).map((id) => store.getProject(id)).filter(Boolean)
)
const goalItems = computed(() =>
  (results.value?.goalIds || []).map((id) => store.getGoal(id)).filter(Boolean)
)
const stakeholderItems = computed(() =>
  (results.value?.stakeholderIds || []).map((id) => store.getStakeholder(id)).filter(Boolean)
)
const competitionItems = computed(() =>
  (results.value?.competitionIds || []).map((id) => store.getCompetition(id)).filter(Boolean)
)
const hypothesisItems = computed(() =>
  (results.value?.hypothesisIds || []).map((id) => store.getHypothesis(id)).filter(Boolean)
)
const personaItems = computed(() =>
  (results.value?.personaIds || []).map((id) => store.getPersona(id)).filter(Boolean)
)
const scenarioItems = computed(() =>
  (results.value?.scenarioIds || []).map((id) => store.getScenario(id)).filter(Boolean)
)
const requirementItems = computed(() =>
  (results.value?.requirementIds || []).map((id) => store.getRequirement(id)).filter(Boolean)
)

let debounceTimer
watch(query, (q) => {
  clearTimeout(debounceTimer)
  if (!q.trim()) {
    results.value = null
    return
  }
  debounceTimer = setTimeout(() => {
    results.value = store.search(q.trim())
  }, 200)
})

function runSearch() {
  if (query.value.trim()) {
    results.value = store.search(query.value.trim())
  }
}

function handleClick(e) {
  if (modalRef.value && !modalRef.value.contains(e.target)) {
    emit('close')
  }
}

let timeoutId

onMounted(() => {
  document.body.style.overflow = 'hidden'
  inputRef.value?.focus()
  timeoutId = setTimeout(() => {
    document.addEventListener('click', handleClick)
  }, 0)
})

onUnmounted(() => {
  clearTimeout(timeoutId)
  document.removeEventListener('click', handleClick)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-xl);
  z-index: 1000;
  overflow-y: auto;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 320px;
  max-width: 560px;
  margin: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
}

.modal-body {
  padding: var(--space-md);
}

.search-results {
  max-height: 60vh;
  overflow-y: auto;
  margin-top: var(--space-md);
}

.search-results > div > * + * {
  margin-top: var(--space-md);
}

.icon-btn {
  padding: var(--space-sm);
  font-size: 1.5rem;
  line-height: 1;
}
</style>
