/**
 * Předdefinované typy UX aktivit seřazené v typickém pořadí UX procesu.
 * Data (názvy, popisy, checklisty, metodika) jsou v data/activity-types.yaml.
 *
 * Metodika (`guide`) je stručně převyprávěná z interní knihovny technik design týmu.
 * Záměrně neobsahuje jména, klienty ani odkazy na interní nástroje – jde jen o obecný postup.
 */

import { ACTIVITY_CONFIG } from './dataConfig.js'

/** @typedef {'project'|'research'|'design'} ActivityGroup */

/**
 * @typedef {Object} ActivityGuide
 * @property {string} why - Proč a kdy technika nejvíc pomůže
 * @property {string} when - Ve které fázi projektu ji použít
 * @property {string} duration - Orientační časová náročnost
 * @property {string} who - Kdo se účastní
 * @property {string[]} steps - Postup krok za krokem
 * @property {string[]} outputs - Výstupy
 */

/**
 * @typedef {Object} ActivityType
 * @property {string} key - Unikátní klíč typu
 * @property {ActivityGroup} group - Skupina aktivit
 * @property {string} defaultName - Výchozí název
 * @property {string} defaultDescription - Výchozí popis (jen pro čtení)
 * @property {number} sortOrder - Pořadí v UX procesu
 * @property {number} defaultDurationDays - Výchozí délka trvání ve dnech
 * @property {boolean} createOnNewProject - Zakládat automaticky u nového projektu (lze změnit v konfiguraci)
 * @property {ChecklistItem[]} checklist - Výchozí checklist
 * @property {ActivityGuide} guide - Metodika „Jak na to“
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id - Unikátní klíč položky v rámci typu aktivity
 * @property {string} label - Text položky checklistu
 */

/** @type {ActivityType[]} Katalog z data/activity-types.yaml */
export const ACTIVITY_TYPES = ACTIVITY_CONFIG.types

/** Platné skupiny aktivit. */
export const ACTIVITY_GROUPS = ACTIVITY_CONFIG.groups

/**
 * Vrátí typ aktivity podle klíče.
 * @param {string} key
 * @returns {ActivityType|undefined}
 */
export function getActivityType(key) {
  return ACTIVITY_TYPES.find((t) => t.key === key)
}

/**
 * Vrátí metodiku typu aktivity v normalizované podobě (tolerantní k chybějícím polím).
 * @param {string} key
 * @returns {ActivityGuide|null}
 */
export function getActivityGuide(key) {
  const g = getActivityType(key)?.guide
  if (!g || typeof g !== 'object') return null
  const str = (v) => (typeof v === 'string' ? v : '')
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])
  return {
    why: str(g.why),
    when: str(g.when),
    duration: str(g.duration),
    who: str(g.who),
    steps: list(g.steps),
    outputs: list(g.outputs),
  }
}
