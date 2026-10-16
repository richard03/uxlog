/**
 * Zápisník jako chat – čisté funkce pro historii zpráv projektu.
 *
 * Záznam historie (project.notebookHistory[]):
 * {
 *   id: string,
 *   createdAt: ISO string,
 *   mode: 'process' | 'ask',      // „Vložit informace“ (AI navrhne zápis) | „Zeptat se“ (AI jen odpoví)
 *   text: string,                 // text vložený uživatelem
 *   answer: string,               // odpověď AI (režim 'ask')
 *   status: 'processing' | 'done' | 'error' | 'saved',
 *   error: string,                // chybová hláška (status 'error')
 *   outcomes: Array<{ entity, type, entityName, outcome: 'confirmed' | 'skipped' }>,
 * }
 * 'saved' = uloženo bez AI (AI není nastavena nebo jde o převzatý starý zápisník).
 */

export const NOTEBOOK_STATUSES = ['processing', 'done', 'error', 'saved']
export const NOTEBOOK_MODES = ['process', 'ask']
export const LEGACY_ENTRY_ID = 'legacy-notebook'

/**
 * Vytvoří nový záznam historie zápisníku.
 * @param {string} text
 * @param {{ id: string, now?: string, status?: string, mode?: string }} opts
 * @returns {Object}
 */
export function createNotebookEntry(text, { id, now = new Date().toISOString(), status = 'processing', mode = 'process' } = {}) {
  return {
    id,
    createdAt: now,
    mode: NOTEBOOK_MODES.includes(mode) ? mode : 'process',
    text: String(text ?? '').trim(),
    answer: '',
    status: NOTEBOOK_STATUSES.includes(status) ? status : 'processing',
    error: '',
    outcomes: [],
  }
}

/**
 * Normalizuje jeden výsledek akce AI.
 * @param {*} o
 * @returns {Object|null}
 */
function normalizeOutcome(o) {
  if (!o || typeof o !== 'object') return null
  return {
    entity: typeof o.entity === 'string' ? o.entity : '',
    type: o.type === 'update' ? 'update' : 'create',
    entityName: typeof o.entityName === 'string' ? o.entityName : '',
    outcome: o.outcome === 'confirmed' ? 'confirmed' : 'skipped',
  }
}

/**
 * Normalizuje jeden záznam historie (tolerantní ke starým/poškozeným datům).
 * @param {*} e
 * @returns {Object|null}
 */
function normalizeEntry(e) {
  if (!e || typeof e !== 'object' || !e.id) return null
  return {
    id: String(e.id),
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : '',
    mode: e.mode === 'ask' ? 'ask' : 'process',
    text: typeof e.text === 'string' ? e.text : '',
    answer: typeof e.answer === 'string' ? e.answer : '',
    status: NOTEBOOK_STATUSES.includes(e.status) ? e.status : 'saved',
    error: typeof e.error === 'string' ? e.error : '',
    outcomes: Array.isArray(e.outcomes) ? e.outcomes.map(normalizeOutcome).filter(Boolean) : [],
  }
}

/**
 * Vrátí normalizovanou historii zápisníku projektu (od nejstarší).
 * Starý textový zápisník (project.notebook) se zobrazí jako první záznam, dokud nebyl převzat.
 * @param {Object|null} project
 * @returns {Array<Object>}
 */
export function getNotebookHistory(project) {
  const raw = Array.isArray(project?.notebookHistory) ? project.notebookHistory : []
  const history = raw.map(normalizeEntry).filter(Boolean)
  const legacy = typeof project?.notebook === 'string' ? project.notebook.trim() : ''
  if (legacy && !history.some((e) => e.id === LEGACY_ENTRY_ID)) {
    history.unshift({
      ...createNotebookEntry(legacy, { id: LEGACY_ENTRY_ID, now: project?.createdAt || '', status: 'saved' }),
    })
  }
  return history
}

/**
 * Přidá záznam na konec historie. Vrací změny projektu (převzetí starého zápisníku do historie).
 * @param {Object|null} project
 * @param {Object} entry
 * @returns {{ notebookHistory: Array<Object>, notebook: string }}
 */
export function appendNotebookEntry(project, entry) {
  return { notebookHistory: [...getNotebookHistory(project), entry], notebook: '' }
}

/**
 * Aktualizuje záznam historie podle id. Neznámé id historii nemění.
 * @param {Object|null} project
 * @param {string} entryId
 * @param {Object} updates
 * @returns {{ notebookHistory: Array<Object>, notebook: string }}
 */
export function updateNotebookEntry(project, entryId, updates) {
  const notebookHistory = getNotebookHistory(project).map((e) =>
    e.id === entryId ? normalizeEntry({ ...e, ...updates, id: e.id }) : e,
  )
  return { notebookHistory, notebook: '' }
}

/**
 * Sestaví výsledky revize navržených akcí.
 * @param {Array<Object>} actions - akce navržené AI
 * @param {Set<*>|Array<*>} confirmedIds - _id potvrzených akcí
 * @returns {Array<Object>}
 */
export function buildOutcomes(actions, confirmedIds) {
  const confirmed = new Set(confirmedIds || [])
  return (Array.isArray(actions) ? actions : []).map((a) =>
    normalizeOutcome({ ...a, outcome: confirmed.has(a?._id) ? 'confirmed' : 'skipped' }),
  ).filter(Boolean)
}

/**
 * Počty potvrzených / přeskočených akcí.
 * @param {Array<Object>} outcomes
 * @returns {{ confirmed: number, skipped: number }}
 */
export function countOutcomes(outcomes) {
  const list = Array.isArray(outcomes) ? outcomes : []
  const confirmed = list.filter((o) => o?.outcome === 'confirmed').length
  return { confirmed, skipped: list.length - confirmed }
}
