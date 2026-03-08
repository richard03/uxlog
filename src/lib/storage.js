/**
 * Modul pro práci s localStorage.
 * Centralizuje přístup k datům a zajišťuje konzistentní klíče.
 */

const STORAGE_KEY = 'uxlog_data'

/**
 * Načte všechna data z localStorage.
 * @returns {Object} Objekt s daty nebo prázdný objekt při chybě
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getEmptyData()
  } catch (e) {
    console.error('loadData failed:', e)
    return getEmptyData()
  }
}

/**
 * Uloží všechna data do localStorage.
 * @param {Object} data - Data k uložení
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('saveData failed:', e)
    throw e
  }
}

/**
 * Vrátí prázdnou strukturu dat aplikace.
 * @returns {Object}
 */
export function getEmptyData() {
  return {
    projects: [],
    goals: [],
    stakeholders: [],
    competitions: [],
    hypotheses: [],
    personas: [],
    scenarios: [],
    requirements: [],
    activities: [],
    teamMembers: [],
    tasks: [],
    bugs: [],
  }
}
