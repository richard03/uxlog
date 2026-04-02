/**
 * Formátování datumů a času pro zobrazení podle aktivního UI jazyka (Intl).
 */

import { dateLocaleBcp47ForUi } from '../i18n/dateLocale.js'

/** Řetězec pouze kalendářního data YYYY-MM-DD (bez času). */
const YMD_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Výchozí volby pro kalendářní datum v kartách a termínech. */
const DEFAULT_CALENDAR_DISPLAY = Object.freeze({
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * Vrátí BCP 47 locale pro formátování (odpovídá výchozímu jazyku aplikace).
 * @returns {string}
 */
function displayLocale() {
  return dateLocaleBcp47ForUi()
}

/**
 * Parsuje YYYY-MM-DD na lokální Date bez posunu UTC oproti `new Date('YYYY-MM-DD')`.
 * @param {string} ymd
 * @returns {Date|null}
 */
function parseCalendarYmd(ymd) {
  const parts = String(ymd).trim().split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

/**
 * Zobrazí kalendářní datum (uložené jako YYYY-MM-DD) v lokálním formátu.
 * @param {string|null|undefined} ymd
 * @param {Intl.DateTimeFormatOptions} [intlOptions] - přepíše výchozí day/month/year
 * @returns {string}
 */
export function formatCalendarDate(ymd, intlOptions = {}) {
  if (ymd == null || ymd === '') return ''
  const date = parseCalendarYmd(ymd)
  if (!date) return String(ymd)
  const opts = { ...DEFAULT_CALENDAR_DISPLAY, ...intlOptions }
  return date.toLocaleDateString(displayLocale(), opts)
}

/**
 * Formátuje uložené ISO datum/čas (např. lastWorkedAt) na datum v lokálním formátu.
 * U čistého YYYY-MM-DD použije stejnou cestu jako formatCalendarDate (žádný UTC posun).
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (iso == null || iso === '') return ''
  const s = String(iso).trim()
  if (YMD_ONLY.test(s)) return formatCalendarDate(s)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(displayLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formátuje čas synchronizace ve status baru: v den „dnes“ jen čas, jinak datum + čas dle lokality.
 * @param {string|null|undefined} iso
 * @returns {string|null}
 */
export function formatStatusBarDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const loc = displayLocale()
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const timeFmt = new Intl.DateTimeFormat(loc, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  if (sameDay) return timeFmt.format(d)
  return new Intl.DateTimeFormat(loc, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}
