/**
 * Zásobník otevřených dialogů a pohyb fokusu klávesou Tab.
 * Na Esc, klik mimo a Tab reaguje jen nejvyšší (naposledy otevřený) dialog.
 *
 * Čisté funkce bez side effects (zásobník je obyčejný objekt bez DOM).
 */

/**
 * Vytvoří zásobník dialogů.
 * @returns {{ push: (id: string) => void, remove: (id: string) => void, isTop: (id: string) => boolean, size: () => number }}
 */
export function createDialogStack() {
  const ids = []
  return {
    push(id) {
      const i = ids.indexOf(id)
      if (i >= 0) ids.splice(i, 1)
      ids.push(id)
    },
    remove(id) {
      const i = ids.indexOf(id)
      if (i >= 0) ids.splice(i, 1)
    },
    isTop(id) {
      return ids.length > 0 && ids[ids.length - 1] === id
    },
    size() {
      return ids.length
    },
  }
}

/**
 * Kam přesunout fokus po stisku Tab uvnitř dialogu (fokus se drží uvnitř, na konci se vrací na začátek).
 * @param {number} count - počet prvků, které jdou zaměřit
 * @param {number} current - index právě zaměřeného prvku (-1 = fokus je mimo ně)
 * @param {boolean} backwards - Shift+Tab
 * @returns {number|null} index cíle, nebo null = nechat prohlížeč (fokus zůstává uvnitř sám)
 */
export function nextFocusIndex(count, current, backwards) {
  if (!Number.isInteger(count) || count <= 0) return null
  if (!Number.isInteger(current) || current < 0 || current >= count) return backwards ? count - 1 : 0
  if (backwards && current === 0) return count - 1
  if (!backwards && current === count - 1) return 0
  return null
}
