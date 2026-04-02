/**
 * Čisté funkce pro zobrazení úkolů na kartě projektu a v přehledech.
 */

import { daysRemaining } from './deadline.js'

/**
 * Vrátí true, pokud je úkol ve stavu „nedokončený“ (vyžaduje práci).
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
export function isTaskIncomplete(task) {
  return (task?.status || 'incomplete') === 'incomplete'
}

/**
 * Vrátí true, pokud má úkol vyplněný termín a ten už podle lokálního data uplynul.
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
export function isTaskOverdue(task) {
  const dr = daysRemaining(task?.dueDate)
  return dr !== null && dr < 0
}

/**
 * Nedokončený úkol s datem splnění v minulosti (typicky „prošlé“ v přehledech).
 * @param {Object|null|undefined} task
 * @returns {boolean}
 */
export function isIncompleteTaskOverdue(task) {
  return isTaskIncomplete(task) && isTaskOverdue(task)
}

/**
 * Shrnutí nedokončených úkolů pro štítek na kartě projektu.
 * @param {Array<Object>} tasks
 * @returns {{ count: number, overdueCount: number }}
 */
export function summarizeIncompleteTasksForProjectBadge(tasks) {
  const incomplete = (tasks || []).filter(isTaskIncomplete)
  let overdueCount = 0
  for (const t of incomplete) {
    if (isTaskOverdue(t)) overdueCount++
  }
  return { count: incomplete.length, overdueCount }
}
