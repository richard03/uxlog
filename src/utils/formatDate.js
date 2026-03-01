/**
 * Formátování datumů pro zobrazení.
 */

/**
 * Formátuje ISO datum do lokálního formátu.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
