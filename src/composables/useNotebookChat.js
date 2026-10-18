/**
 * Composable pro Zápisník jako AI chat.
 * Uživatel odesílá zprávy; každá zůstává natrvalo v historii projektu. Dva režimy:
 * - 'process' („Vložit informace“): AI navrhne zápis do entit, akce projdou revizí (NotebookModal);
 * - 'ask' („Zeptat se“): AI jen odpoví textem – nic se nezapisuje do entit ani jinam (kromě historie zápisníku).
 */

import { ref, computed, toValue } from 'vue'
import { useStore } from './useStore.js'
import { hasCapability, callCapability } from '../lib/plugins/registry.js'
import { useEntityHelpers } from './useEntityHelpers.js'
import { useI18n } from './useI18n.js'
import { useConfig } from './useConfig.js'
import { buildOutcomes, countOutcomes, LEGACY_ENTRY_ID } from '../lib/notebookChat.js'

/** Entity s automatickým kódem → getter pro existující položky (prefix kódu je v data/entities.yaml). */
const CODE_ENTITIES = {
  goal: 'getGoals',
  hypothesis: 'getHypotheses',
  persona: 'getPersonas',
  scenario: 'getScenarios',
  requirement: 'getRequirements',
  risk: 'getRisks',
}

/** Entita → [název metody pro vytvoření, název metody pro úpravu] ve store */
const ENTITY_METHODS = {
  persona: ['addPersona', 'updatePersona'],
  requirement: ['addRequirement', 'updateRequirement'],
  goal: ['addGoal', 'updateGoal'],
  stakeholder: ['addStakeholder', 'updateStakeholder'],
  competition: ['addCompetition', 'updateCompetition'],
  hypothesis: ['addHypothesis', 'updateHypothesis'],
  scenario: ['addScenario', 'updateScenario'],
  teamMember: ['addTeamMember', 'updateTeamMember'],
  risk: ['addRisk', 'updateRisk'],
}

/** Id záznamů, které se zpracovávají v tomto běhu aplikace (sdílené napříč instancemi). */
const inFlight = ref(new Set())

/** Fronta revizí návrhů AI: { projectId, entryId, actions } – přežije přechod mezi obrazovkami. */
const reviewQueue = ref([])

/**
 * @param {import('vue').MaybeRefOrGetter<string>} projectIdRef
 */
export function useNotebookChat(projectIdRef) {
  const store = useStore()
  const { generateNextCode, getCodePrefix } = useEntityHelpers()
  const { t } = useI18n()
  const { getTemplate } = useConfig()

  const projectId = computed(() => toValue(projectIdRef))
  const history = computed(() => store.getProjectNotebookHistory(projectId.value))

  /** Dostupnost AI – hasCapability() sleduje reaktivní verzi registru, klíč se ověřuje při každém volání. */
  const isAiAvailable = () => hasCapability('ai:available') && !!callCapability('ai:available')
  const aiAvailable = computed(isAiAvailable)

  const currentReview = computed(() => reviewQueue.value.find((r) => r.projectId === projectId.value) || null)

  /**
   * Stav záznamu pro UI – 'interrupted', pokud zpracování neproběhlo v tomto běhu aplikace.
   * @param {Object} entry
   * @returns {string}
   */
  function displayStatus(entry) {
    if (entry.status !== 'processing') return entry.status
    if (reviewQueue.value.some((r) => r.entryId === entry.id)) return 'review'
    return inFlight.value.has(entry.id) ? 'processing' : 'interrupted'
  }

  function setInFlight(entryId, on) {
    const next = new Set(inFlight.value)
    if (on) next.add(entryId)
    else next.delete(entryId)
    inFlight.value = next
  }

  function buildProjectData(pid) {
    return {
      // Navíc pro dotazy (ai:notebook je ignoruje)
      activities: store.getActivities(pid),
      methodology: store.getActivities(pid).map((a) => ({ name: a.name, guide: a.typeKey ? getTemplate(a.typeKey)?.guide : null })),
      tasks: store.getTasks(pid),
      bugs: store.getBugs(pid),
      connections: store.getConnections(pid),
      goals: store.getGoals(pid),
      stakeholders: store.getStakeholders(pid),
      competitions: store.getCompetitions(pid),
      hypotheses: store.getHypotheses(pid),
      personas: store.getPersonas(pid),
      scenarios: store.getScenarios(pid),
      requirements: store.getRequirements(pid),
      teamMembers: store.getTeamMembers(pid),
      risks: store.getRisks(pid),
    }
  }

  /**
   * Zpracuje záznam pomocí AI (asynchronně).
   * @param {string} pid
   * @param {Object} entry
   */
  async function processEntry(pid, entry) {
    setInFlight(entry.id, true)
    store.updateNotebookEntryInProject(pid, entry.id, { status: 'processing', error: '' })
    try {
      const { actions, failedParts = 0, totalParts = 1 } = await callCapability('ai:notebook', entry.text, buildProjectData(pid))
      const list = Array.isArray(actions) ? actions : []
      // Dlouhý text se zpracovává po částech – nezpracované části uživateli nezamlčíme
      if (failedParts > 0) {
        store.updateNotebookEntryInProject(pid, entry.id, { error: t.notebook.partialFailure(failedParts, totalParts) })
      }
      if (list.length === 0) {
        store.updateNotebookEntryInProject(pid, entry.id, { status: 'done', outcomes: [] })
      } else {
        reviewQueue.value = [...reviewQueue.value, { projectId: pid, entryId: entry.id, actions: list.map((a, i) => ({ ...a, _id: i })) }]
      }
    } catch (e) {
      store.updateNotebookEntryInProject(pid, entry.id, { status: 'error', error: e?.message || String(e) })
    } finally {
      setInFlight(entry.id, false)
    }
  }

  /**
   * Odpoví na dotaz (režim „Zeptat se“). Výsledkem je jen text odpovědi u zprávy – žádné akce, žádná revize.
   * @param {string} pid
   * @param {Object} entry
   */
  async function askEntry(pid, entry) {
    setInFlight(entry.id, true)
    store.updateNotebookEntryInProject(pid, entry.id, { status: 'processing', error: '' })
    try {
      if (!hasCapability('ai:ask')) throw new Error(t.notebook.askUnavailable)
      const earlier = history.value.filter((e) => e.id !== entry.id && e.createdAt <= entry.createdAt)
      const res = await callCapability('ai:ask', entry.text, buildProjectData(pid), earlier)
      store.updateNotebookEntryInProject(pid, entry.id, { status: 'done', answer: String(res?.answer ?? '') })
    } catch (e) {
      store.updateNotebookEntryInProject(pid, entry.id, { status: 'error', error: e?.message || String(e) })
    } finally {
      setInFlight(entry.id, false)
    }
  }

  /** Spustí AI podle režimu zprávy. */
  function runEntry(pid, entry) {
    return entry.mode === 'ask' ? askEntry(pid, entry) : processEntry(pid, entry)
  }

  /**
   * Odešle novou zprávu do zápisníku.
   * @param {string} text
   * @param {'process'|'ask'} mode
   * @returns {boolean} zda byla zpráva přijata
   */
  function send(text, mode = 'process') {
    const trimmed = String(text ?? '').trim()
    const pid = projectId.value
    if (!trimmed || !pid) return false
    const useAi = isAiAvailable()
    // Dotaz bez AI nemá smysl – nepřijímá se (UI tlačítko zakáže)
    if (mode === 'ask' && !useAi) return false
    const entry = store.addNotebookEntry(pid, trimmed, useAi ? 'processing' : 'saved', mode)
    if (!entry) return false
    if (useAi) runEntry(pid, entry)
    return true
  }

  /**
   * Znovu zpracuje zprávu (po chybě nebo přerušení).
   * @param {string} entryId
   */
  function retry(entryId) {
    const entry = history.value.find((e) => e.id === entryId)
    if (!entry || !isAiAvailable() || inFlight.value.has(entryId)) return
    runEntry(projectId.value, entry)
  }

  /**
   * Zapíše jednu potvrzenou akci AI do store.
   * @param {Object} action
   */
  function applyAction(action) {
    const pid = currentReview.value?.projectId
    const methods = ENTITY_METHODS[action?.entity]
    if (!pid || !methods) return
    const fields = { ...action.fields }
    if (action.type === 'create') {
      const getter = CODE_ENTITIES[action.entity]
      const prefix = getCodePrefix(action.entity)
      if (getter && prefix && !fields.code) {
        fields.code = generateNextCode(prefix, store[getter](pid))
      }
      store[methods[0]](pid, fields)
    } else if (action.type === 'update' && action.entityId) {
      store[methods[1]](action.entityId, fields)
    }
  }

  /**
   * Ukončí aktuální revizi a zapíše výsledek do historie.
   * @param {Array<number>} confirmedIds - _id potvrzených akcí
   */
  function finishReview(confirmedIds) {
    const review = currentReview.value
    if (!review) return
    store.updateNotebookEntryInProject(review.projectId, review.entryId, {
      status: 'done',
      outcomes: buildOutcomes(review.actions, confirmedIds),
    })
    reviewQueue.value = reviewQueue.value.filter((r) => r !== review)
  }

  return {
    history, aiAvailable, displayStatus, send, retry, currentReview, applyAction, finishReview,
    countOutcomes, legacyEntryId: LEGACY_ENTRY_ID,
  }
}
