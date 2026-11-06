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
import { verifyQuotes, findAlteredQuotes, changedFields, fallbackMerge } from '../lib/notebookMerge.js'
import { notebookFieldKeys } from '../lib/plugins/ai-shared/prompts.js'

/** Entity s automatickým kódem → getter pro existující položky (prefix kódu je v data/entities.yaml). */
const CODE_ENTITIES = {
  goal: 'getGoals',
  hypothesis: 'getHypotheses',
  persona: 'getPersonas',
  scenario: 'getScenarios',
  requirement: 'getRequirements',
  risk: 'getRisks',
}

/** Entita → [vytvoření, úprava, jeden záznam, seznam záznamů projektu, kolekce] – názvy metod ve store a klíč kolekce */
const ENTITY_METHODS = {
  persona: ['addPersona', 'updatePersona', 'getPersona', 'getPersonas', 'personas'],
  requirement: ['addRequirement', 'updateRequirement', 'getRequirement', 'getRequirements', 'requirements'],
  goal: ['addGoal', 'updateGoal', 'getGoal', 'getGoals', 'goals'],
  stakeholder: ['addStakeholder', 'updateStakeholder', 'getStakeholder', 'getStakeholders', 'stakeholders'],
  competition: ['addCompetition', 'updateCompetition', 'getCompetition', 'getCompetitions', 'competitions'],
  hypothesis: ['addHypothesis', 'updateHypothesis', 'getHypothesis', 'getHypotheses', 'hypotheses'],
  scenario: ['addScenario', 'updateScenario', 'getScenario', 'getScenarios', 'scenarios'],
  teamMember: ['addTeamMember', 'updateTeamMember', 'getTeamMember', 'getTeamMembers', 'teamMembers'],
  risk: ['addRisk', 'updateRisk', 'getRisk', 'getRisks', 'risks'],
}

/** Chyby zpracování zdrojů v tomto běhu aplikace (id zdroje → text chyby). */
const sourceErrors = ref({})
/** Výsledek posledního zpracování zdroje v tomto běhu aplikace (id zdroje → hláška). */
const sourceNotices = ref({})

/** Kolik slučování (volání AI) běží najednou. */
const MERGE_CONCURRENCY = 3

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
  const { t, tPath } = useI18n()
  const projectId = computed(() => toValue(projectIdRef))
  const { getTemplate, getEffectiveEntityFields } = useConfig(() => projectId.value)
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

  /**
   * Data projektu pro AI. Zdroje (text dokumentů, rozhovorů, e-mailů) se přidávají pro chat;
   * při zpracování zdroje ne (zpracovávaný text jde zvlášť).
   */
  function buildProjectData(pid, { withSources = true } = {}) {
    return {
      ...(withSources ? { sources: store.getSources(pid) } : {}),
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
      // „Měnit data“: text je pokyn uživatele, obsah AI čerpá i ze zdrojů projektu
      const instruction = entry.mode === 'change'
      const projectData = buildProjectData(pid)
      const { actions, failedParts = 0, totalParts = 1 } = await callCapability('ai:notebook', entry.text, projectData, { instruction })
      const list = Array.isArray(actions) ? actions : []
      // Citace se u pokynu ověřují proti pokynu i textu zdrojů
      const reviewText = instruction
        ? [entry.text, ...(projectData.sources || []).map((s) => s.content || '')].filter(Boolean).join('\n\n')
        : entry.text
      // Dlouhý text se zpracovává po částech – nezpracované části uživateli nezamlčíme
      if (failedParts > 0) {
        store.updateNotebookEntryInProject(pid, entry.id, { error: t.notebook.partialFailure(failedParts, totalParts) })
      }
      if (list.length === 0) {
        store.updateNotebookEntryInProject(pid, entry.id, { status: 'done', outcomes: [] })
      } else {
        startReview(pid, { ...entry, text: reviewText }, list, { kind: 'chat', id: entry.id })
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

  /**
   * Zpracuje zdroj pomocí AI: z jeho textu navrhne nové a upravené záznamy (stejně jako poznámky).
   * Po revizi se potvrzené záznamy propojí se zdrojem a zdroj dostane datum zpracování.
   * @param {string} sourceId
   */
  async function processSource(sourceId) {
    const source = store.getSource(sourceId)
    if (!source || !isAiAvailable() || inFlight.value.has(sourceId)) return
    const pid = source.projectId
    setInFlight(sourceId, true)
    setSourceError(sourceId, '')
    try {
      const { actions, failedParts = 0, totalParts = 1 } = await callCapability('ai:notebook', source.content || '', buildProjectData(pid, { withSources: false }))
      const list = Array.isArray(actions) ? actions : []
      if (failedParts > 0) setSourceError(sourceId, t.notebook.partialFailure(failedParts, totalParts))
      if (list.length === 0) {
        store.updateSource(sourceId, { processedAt: new Date().toISOString() })
        sourceNotices.value = { ...sourceNotices.value, [sourceId]: t.sources.nothingFound }
      } else {
        startReview(pid, { id: sourceId, text: source.content || '' }, list, { kind: 'source', id: sourceId })
      }
    } catch (e) {
      setSourceError(sourceId, e?.message || String(e))
    } finally {
      setInFlight(sourceId, false)
    }
  }

  function setSourceError(sourceId, message) {
    const next = { ...sourceErrors.value }
    if (message) next[sourceId] = message
    else delete next[sourceId]
    sourceErrors.value = next
  }

  /**
   * Stav zpracování zdroje pro UI.
   * @param {string} sourceId
   * @returns {{ processing: boolean, review: boolean, error: string, notice: string }}
   */
  function sourceStatus(sourceId) {
    return {
      processing: inFlight.value.has(sourceId),
      review: reviewQueue.value.some((r) => r.origin?.kind === 'source' && r.origin.id === sourceId),
      error: sourceErrors.value[sourceId] || '',
      notice: sourceNotices.value[sourceId] || '',
    }
  }

  /** Spustí AI podle režimu zprávy. */
  function runEntry(pid, entry) {
    return entry.mode === 'ask' ? askEntry(pid, entry) : processEntry(pid, entry)
  }

  /**
   * Odešle novou zprávu do zápisníku.
   * @param {string} text
   * @param {'ask'|'change'} mode - „Zeptat se“ | „Měnit data“
   * @returns {boolean} zda byla zpráva přijata
   */
  function send(text, mode = 'change') {
    const trimmed = String(text ?? '').trim()
    const pid = projectId.value
    // Chat bez AI nemá smysl – zpráva se nepřijímá (UI tlačítko zakáže)
    if (!trimmed || !pid || !isAiAvailable()) return false
    const entry = store.addNotebookEntry(pid, trimmed, 'processing', mode === 'ask' ? 'ask' : 'change')
    if (!entry) return false
    runEntry(pid, entry)
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

  // --- Revize: doplnění existujících záznamů ---------------------------------------------

  /**
   * Existující záznam projektu, kterého se akce týká, nebo null.
   * @param {string} pid
   * @param {string} entityType
   * @param {string} id
   */
  function findEntity(pid, entityType, id) {
    const getter = ENTITY_METHODS[entityType]?.[2]
    const entity = getter && id ? store[getter](id) : null
    return entity && entity.projectId === pid ? entity : null
  }

  /** Kopie záznamu bez reaktivity (stav „vlevo“ v revizi se nemá měnit pod rukama). */
  function snapshot(entity) {
    return entity ? JSON.parse(JSON.stringify(entity)) : null
  }

  /** Označení záznamu pro uživatele: „PER-003 Jana“. */
  function entityLabel(entity) {
    return [entity?.code, entity?.name].filter((s) => typeof s === 'string' && s.trim()).join(' ') || entity?.id || ''
  }

  /**
   * Pole typu entity pro revizi (jen ta, která AI smí měnit) s popisky a volbami z konfigurace entit.
   * @param {string} entityType
   * @returns {Array<{ key: string, label: string, type: string, options: Array<{ value: string, label: string }> }>}
   */
  function fieldMeta(entityType) {
    const configured = new Map(getEffectiveEntityFields(entityType, tPath).map((f) => [f.key, f]))
    return notebookFieldKeys(entityType).map((key) => {
      const f = configured.get(key)
      const own = tPath(`${entityType}.${key}`)
      return {
        key,
        label: f?.label || (own !== `${entityType}.${key}` ? own : key),
        type: f?.type || (key === 'name' || key === 'code' ? 'text' : 'textarea'),
        options: Array.isArray(f?.options) ? f.options : [],
      }
    })
  }

  /**
   * Záznamy stejného typu v projektu (pro „Sloučit do existující…“).
   * @param {string} entityType
   * @returns {Array<{ id: string, label: string }>}
   */
  function candidates(entityType) {
    const list = ENTITY_METHODS[entityType]?.[3]
    if (!list) return []
    return store[list](currentReview.value?.projectId || projectId.value).map((e) => ({ id: e.id, label: entityLabel(e) }))
  }

  /** Návrh (pravý sloupec) z hodnot záznamu a změněných polí. */
  function buildProposal(entityType, original, changes) {
    const proposal = {}
    for (const key of notebookFieldKeys(entityType)) {
      const v = original?.[key]
      proposal[key] = v == null ? '' : typeof v === 'string' ? v : String(v)
    }
    return { ...proposal, ...changes }
  }

  /**
   * Sloučí nové informace do existujícího záznamu pomocí AI (při selhání bez AI – připojením).
   * Výsledek: action.proposal = celý návrh záznamu, action.merge = 'done' | 'failed'.
   * @param {Object} review
   * @param {Object} action - reaktivní akce z revize
   */
  async function runMerge(review, action) {
    const entity = findEntity(review.projectId, action.entity, action.entityId)
    if (!entity) {
      // Úprava neexistujícího záznamu (AI si spletla ID, nebo byl mezitím smazán) → nový záznam
      Object.assign(action, { type: 'create', entityId: null, original: null, merge: null, proposal: { name: action.createName || '', ...action.extracted }, focusKeys: createFocusKeys(action.extracted) })
      return
    }
    const original = snapshot(entity)
    const token = Symbol('merge')
    Object.assign(action, { original, entityName: entityLabel(entity), merge: 'pending', mergeError: '', mergeToken: token })
    const textKeys = fieldMeta(action.entity).filter((f) => f.type === 'textarea').map((f) => f.key)
    let changes
    let status = 'done'
    let error = ''
    try {
      if (!hasCapability('ai:merge')) throw new Error(t.notebook.mergeUnavailable)
      const res = await callCapability('ai:merge', action.entity, original, action.quotes.map((q) => q.text), review.notesText, action.extracted)
      changes = changedFields(original, res?.fields || {})
    } catch (e) {
      changes = fallbackMerge(original, action.extracted, { textKeys })
      status = 'failed'
      error = e?.message || String(e)
    }
    // Mezitím uživatel mohl zvolit jiný cíl sloučení – starý výsledek zahodit
    if (action.mergeToken !== token) return
    // Sloučení nesmí smazat název existujícího záznamu
    if ('name' in changes && !String(changes.name).trim()) delete changes.name
    // focusKeys: pole, která se mění – v návrhu jsou nahoře (pořadí se při psaní už nemění)
    Object.assign(action, { proposal: buildProposal(action.entity, original, changes), focusKeys: Object.keys(changes), merge: status, mergeError: error })
  }

  /** Klíče polí nahoře v návrhu nového záznamu – název vždy první (musí jít doplnit). */
  function createFocusKeys(fields) {
    return ['name', ...Object.keys(fields || {}).filter((k) => k !== 'name')]
  }

  /**
   * Chybí návrhu název? Takový záznam nejde potvrdit (záznam bez názvu nesmí vzniknout).
   * @param {Object} action
   * @returns {boolean}
   */
  function nameMissing(action) {
    return !String(action?.proposal?.name ?? '').trim()
  }

  /** Spustí slučování akcí s omezeným souběhem. */
  async function runMerges(review, actions) {
    let next = 0
    const worker = async () => {
      while (next < actions.length) await runMerge(review, actions[next++])
    }
    await Promise.all(Array.from({ length: Math.min(MERGE_CONCURRENCY, actions.length) }, worker))
  }

  /**
   * Založí revizi návrhů AI: ověří citace a u úprav existujících záznamů spustí slučování.
   * @param {string} pid
   * @param {Object} entry - zpráva zápisníku
   * @param {Array<Object>} list - akce z AI
   */
  function startReview(pid, entry, list, origin = { kind: 'chat', id: entry.id }) {
    const actions = list.map((a, i) => {
      const extracted = { ...(a.fields || {}) }
      return {
        ...a,
        _id: i,
        fields: extracted,
        extracted,
        createName: a.entityName,
        quotes: verifyQuotes(a.quotes, entry.text),
        original: null,
        merge: null,
        mergeError: '',
        proposal: { name: '', ...extracted },
        focusKeys: a.type === 'update' ? Object.keys(extracted) : createFocusKeys(extracted),
      }
    })
    reviewQueue.value = [...reviewQueue.value, { projectId: pid, entryId: entry.id, origin, notesText: entry.text, actions }]
    // Reaktivní kopie z fronty – změny akcí (výsledek slučování) se tak propíší do UI
    const review = reviewQueue.value[reviewQueue.value.length - 1]
    runMerges(review, review.actions.filter((a) => a.type === 'update'))
  }

  /**
   * „Sloučit do existující…“ – návrh nového záznamu se zapracuje do vybraného existujícího.
   * @param {Object} action
   * @param {string} targetId
   */
  function mergeInto(action, targetId) {
    const review = currentReview.value
    if (!review || !findEntity(review.projectId, action.entity, targetId)) return
    Object.assign(action, { type: 'update', entityId: targetId })
    runMerge(review, action)
  }

  /** Vrátí akci zpět na vytvoření nového záznamu (zruší sloučení). */
  function revertToCreate(action) {
    Object.assign(action, {
      type: 'create', entityId: null, entityName: action.createName, original: null,
      merge: null, mergeError: '', mergeToken: null, proposal: { name: action.createName || '', ...action.extracted }, focusKeys: createFocusKeys(action.extracted),
    })
  }

  /** Znovu spustí slučování (např. po chybě AI). */
  function remerge(action) {
    const review = currentReview.value
    if (review && action.type === 'update') runMerge(review, action)
  }

  /**
   * Změněná pole akce (pro zvýraznění a zápis): u úpravy oproti původnímu záznamu, u nového záznamu neprázdná.
   * @param {Object} action
   * @returns {Record<string, string>}
   */
  function actionChanges(action) {
    if (action?.type === 'update') return changedFields(action.original, action.proposal)
    return changedFields(null, Object.fromEntries(Object.entries(action?.proposal || {}).filter(([, v]) => String(v ?? '').trim())))
  }

  /**
   * Citace v návrhu, které nejsou doslova v poznámkách ani v původním záznamu.
   * @param {Object} action
   * @returns {Array<{ field: string, text: string }>}
   */
  function alteredQuotes(action) {
    const sources = [currentReview.value?.notesText || '', ...Object.values(action?.original || {}).filter((v) => typeof v === 'string')]
    return findAlteredQuotes(actionChanges(action), sources)
  }

  /**
   * Zapíše jednu potvrzenou akci AI do store. U úpravy jen pole, která se oproti záznamu
   * v době revize změnila – souběžné úpravy ostatních polí se tak nepřepíšou.
   * @param {Object} action
   */
  function applyAction(action) {
    const pid = currentReview.value?.projectId
    const methods = ENTITY_METHODS[action?.entity]
    if (!pid || !methods) return
    // Záznam bez názvu nesmí vzniknout ani o název přijít (UI potvrzení v tom případě nepustí)
    if (nameMissing(action)) return
    const fields = actionChanges(action)
    let entityId = null
    if (action.type === 'create') {
      const getter = CODE_ENTITIES[action.entity]
      const prefix = getCodePrefix(action.entity)
      if (getter && prefix && !fields.code) {
        fields.code = generateNextCode(prefix, store[getter](pid))
      }
      entityId = store[methods[0]](pid, fields)?.id ?? null
    } else if (action.type === 'update' && action.entityId) {
      if (Object.keys(fields).length) store[methods[1]](action.entityId, fields)
      entityId = action.entityId
    }
    // Záznam vytěžený ze zdroje (nový i doplněný) se se zdrojem propojí souvislostí
    const origin = currentReview.value?.origin
    if (origin?.kind === 'source' && entityId && store.getSource(origin.id)) {
      store.addConnection(pid, 'sources', origin.id, methods[4], entityId)
    }
  }

  /**
   * Ukončí aktuální revizi a zapíše výsledek do historie.
   * @param {Array<number>} confirmedIds - _id potvrzených akcí
   */
  function finishReview(confirmedIds) {
    const review = currentReview.value
    if (!review) return
    if (review.origin?.kind === 'source') {
      // Zdroj je zpracovaný, i když uživatel všechny návrhy přeskočil
      if (store.getSource(review.origin.id)) store.updateSource(review.origin.id, { processedAt: new Date().toISOString() })
      const count = buildOutcomes(review.actions, confirmedIds).filter((o) => o.outcome === 'confirmed').length
      sourceNotices.value = { ...sourceNotices.value, [review.origin.id]: t.sources.processedCount(count) }
    } else {
      store.updateNotebookEntryInProject(review.projectId, review.entryId, {
        status: 'done',
        outcomes: buildOutcomes(review.actions, confirmedIds),
      })
    }
    reviewQueue.value = reviewQueue.value.filter((r) => r !== review)
  }

  return {
    history, aiAvailable, displayStatus, send, retry, currentReview, applyAction, finishReview,
    processSource, sourceStatus,
    countOutcomes, legacyEntryId: LEGACY_ENTRY_ID,
    /** Pomocníci revize (NotebookModal) – sloučení do existujícího záznamu. */
    reviewHelpers: { fieldMeta, candidates, mergeInto, revertToCreate, remerge, actionChanges, alteredQuotes, nameMissing },
  }
}
