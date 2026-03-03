/**
 * Pomocné funkce pro hlídání aktivity na projektech.
 * Čisté funkce bez side effects – vhodné pro unit testy.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Vrátí počet dní od posledního zaznamenání práce na projektu.
 * @param {string} lastWorkedAt – ISO datum
 * @param {Date} [now] – referenční čas (pro testování)
 * @returns {number}
 */
export function daysSinceLastWork(lastWorkedAt, now = new Date()) {
  if (!lastWorkedAt) return Infinity
  return (now.getTime() - new Date(lastWorkedAt).getTime()) / MS_PER_DAY
}

/**
 * Vrátí true, pokud projekt překročil limit nečinnosti daný prioritou:
 *  - high   → více než 1 den
 *  - medium → více než 7 dní
 *  - low    → nikdy (nehlídáme)
 * @param {{ priority: string, lastWorkedAt: string }} project
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isActivityOverdue(project, now = new Date()) {
  const days = daysSinceLastWork(project.lastWorkedAt, now)
  if (project.priority === 'high') return days > 1
  if (project.priority === 'medium') return days > 7
  return false
}
