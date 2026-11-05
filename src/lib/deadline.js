/**
 * Pure funkce pro výpočet a porovnání termínů.
 * Bez side effects – vhodné pro unit testy.
 */

/**
 * Vrátí dnešní datum ve formátu YYYY-MM-DD (lokální čas).
 * @returns {string}
 */
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Přičte dny k datu (lokální čas, bez posunu UTC).
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Vrátí počet zbývajících dní do deadlinu (lokální čas).
 * Kladné = zbývá, záporné = skluz, 0 = dnes; null pro prázdný/neplatný řetězec.
 * @param {string} deadlineStr - YYYY-MM-DD
 * @returns {number|null}
 */
export function daysRemaining(deadlineStr) {
  if (!deadlineStr) return null
  const parts = deadlineStr.split('-').map(Number)
  if (parts.length !== 3) return null
  const [y, m, d] = parts
  const deadline = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((deadline - today) / (1000 * 60 * 60 * 24))
}

/**
 * Vrátí výchozí deadline aktivity dle délky šablony.
 * @param {number|null} durationDays
 * @param {string} [startDate] - YYYY-MM-DD (výchozí: dnes)
 * @returns {string|null}
 */
export function getActivityDeadlineDefault(durationDays, startDate) {
  if (!durationDays) return null
  return addDays(startDate || todayISO(), durationDays)
}

/**
 * Spočítá celkový počet nezaškrtnutých kroků checklistu
 * napříč non-done, non-dismissed aktivitami.
 * @param {Array} activities
 * @returns {number}
 */
export function countUncheckedItems(activities) {
  let count = 0
  for (const a of activities) {
    if (a.status === 'done' || a.dismissed) continue
    const baseChecklist = a.baseChecklist || []
    const removed = new Set(a.removedChecklistItems || [])
    const defaults = baseChecklist.filter((ci) => !removed.has(ci.id))
    const effective = [...defaults, ...(a.customChecklistItems || [])]
    const checked = new Set(a.checkedItems || [])
    for (const ci of effective) {
      if (!checked.has(ci.id)) count++
    }
  }
  return count
}
