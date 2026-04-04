/**
 * Stav badge filtrů na seznamu úkolů — drží se v paměti po dobu života karty,
 * aby po návratu z detailu úkolu zůstaly přepínače nastavené (per projekt).
 */

/** Výchozí stav při prvním vstupu do sekce Úkoly u projektu. */
export const TASK_LIST_FILTER_DEFAULTS = {
  filterIncomplete: true,
  filterDone: false,
  filterCancelled: false,
  filterOverdue: false,
  filterText: '',
}

/** @type {Record<string, typeof TASK_LIST_FILTER_DEFAULTS>} */
const cache = Object.create(null)

/**
 * Vrátí uložený stav filtrů pro projekt, jinak kopii výchozích hodnot.
 * @param {string} projectId
 * @returns {typeof TASK_LIST_FILTER_DEFAULTS}
 */
export function getTasksListFilterState(projectId) {
  const row = cache[projectId]
  if (!row) return { ...TASK_LIST_FILTER_DEFAULTS }
  return {
    filterIncomplete: row.filterIncomplete,
    filterDone: row.filterDone,
    filterCancelled: row.filterCancelled,
    filterOverdue: row.filterOverdue,
    filterText: row.filterText,
  }
}

/**
 * Uloží stav filtrů pro daný projekt (přepíše předchozí záznam).
 * @param {string} projectId
 * @param {typeof TASK_LIST_FILTER_DEFAULTS} state
 */
export function setTasksListFilterState(projectId, state) {
  cache[projectId] = {
    filterIncomplete: state.filterIncomplete,
    filterDone: state.filterDone,
    filterCancelled: state.filterCancelled,
    filterOverdue: state.filterOverdue,
    filterText: state.filterText,
  }
}

/**
 * Vymaže cache (pouze pro unit testy).
 */
export function resetTasksListFilterCacheForTests() {
  for (const k of Object.keys(cache)) delete cache[k]
}
