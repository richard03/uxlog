/**
 * Slučování nových informací ze zápisníku do existujících záznamů – čisté funkce.
 *
 * AI ke každému navrženému záznamu vrací doslovné výňatky z poznámek (citace). Tady se ověří,
 * že výňatky v poznámkách opravdu jsou (a nahradí se přesným zněním zdroje), hlídá se, aby
 * přímé citace v navrženém textu zůstaly beze změny, a počítá se, která pole se skutečně mění.
 */

/** Páry uvozovek, mezi kterými hledáme přímé citace v textu. */
const QUOTE_PAIRS = [['„', '“'], ['“', '”'], ['"', '"'], ['»', '«'], ['«', '»']]
/** Uvozovky, které AI někdy přidá kolem celého výňatku. */
const WRAPPING_QUOTES = /^[\s„“”"'»«‚‘’]+|[\s„“”"'»«‚‘’]+$/g
/** Kratší úseky v uvozovkách (zkratky, jednotlivá slova) se za citaci nepovažují. */
const MIN_QUOTE_CHARS = 8

/**
 * Text bez rozdílů v bílých znacích + mapa indexů zpět do originálu.
 * @param {string} text
 * @returns {{ text: string, map: number[] }} map[i] = index znaku v originálu
 */
function collapseWhitespace(text) {
  const src = String(text ?? '')
  let out = ''
  const map = []
  let pendingSpace = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      pendingSpace = out.length > 0
      continue
    }
    if (pendingSpace) {
      out += ' '
      map.push(i - 1)
      pendingSpace = false
    }
    out += ch
    map.push(i)
  }
  return { text: out, map }
}

/**
 * Najde výňatek ve zdroji (bílé znaky se nemusí shodovat) a vrátí přesný úsek zdroje, nebo null.
 * @param {string} quote
 * @param {{ text: string, map: number[] }} source - collapseWhitespace(zdroj)
 * @param {string} original - původní zdroj
 * @returns {string|null}
 */
function locate(quote, source, original) {
  const needle = collapseWhitespace(quote).text
  if (!needle) return null
  const at = source.text.indexOf(needle)
  if (at < 0) return null
  return original.slice(source.map[at], source.map[at + needle.length - 1] + 1)
}

/**
 * Ověří výňatky z poznámek: nalezený výňatek nahradí přesným zněním zdroje (AI mohla změnit
 * zalomení řádků nebo přidat uvozovky), nenalezený označí jako neověřený. Duplicity vypadnou.
 * @param {unknown} quotes - pole řetězců (nebo už ověřených { text })
 * @param {string} notesText - text poznámek
 * @returns {Array<{ text: string, verified: boolean }>}
 */
export function verifyQuotes(quotes, notesText) {
  const original = String(notesText ?? '')
  const source = collapseWhitespace(original)
  const out = []
  const seen = new Set()
  for (const q of Array.isArray(quotes) ? quotes : []) {
    const raw = typeof q === 'string' ? q : typeof q?.text === 'string' ? q.text : ''
    if (!raw.trim()) continue
    const exact = locate(raw, source, original) ?? locate(raw.replace(WRAPPING_QUOTES, ''), source, original)
    const item = exact ? { text: exact, verified: true } : { text: raw.trim(), verified: false }
    const key = collapseWhitespace(item.text).text
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/**
 * Přímé citace v textu – úseky mezi párovými uvozovkami (bez uvozovek).
 * @param {string} text
 * @returns {string[]}
 */
export function extractQuotedSegments(text) {
  const s = String(text ?? '')
  const out = []
  for (const [open, close] of QUOTE_PAIRS) {
    let from = 0
    while (from < s.length) {
      const a = s.indexOf(open, from)
      if (a < 0) break
      const b = s.indexOf(close, a + open.length)
      if (b < 0) break
      const inner = s.slice(a + open.length, b).trim()
      if (inner.length >= MIN_QUOTE_CHARS && !out.includes(inner)) out.push(inner)
      from = b + close.length
    }
  }
  return out
}

/**
 * Citace v navržených polích, které se nevyskytují doslova v žádném zdroji (poznámky, původní
 * záznam) – AI je pozměnila. Kontroluje úseky v uvozovkách a celé pole „quote“; bílé znaky se
 * neporovnávají.
 * @param {Record<string, unknown>} fields - navržená pole
 * @param {unknown[]} sources - texty, ze kterých citace smí pocházet
 * @returns {Array<{ field: string, text: string }>}
 */
export function findAlteredQuotes(fields, sources) {
  const haystacks = (Array.isArray(sources) ? sources : [])
    .map((s) => collapseWhitespace(typeof s === 'string' ? s : '').text)
    .filter(Boolean)
  const found = (text) => {
    const needle = collapseWhitespace(text).text
    return !needle || haystacks.some((h) => h.includes(needle))
  }
  const out = []
  for (const [field, value] of Object.entries(fields || {})) {
    const text = typeof value === 'string' ? value : ''
    if (!text.trim()) continue
    const candidates = extractQuotedSegments(text)
    if (field === 'quote') {
      const whole = text.replace(WRAPPING_QUOTES, '')
      if (whole && !candidates.includes(whole)) candidates.push(whole)
    }
    for (const c of candidates) {
      if (!found(c)) out.push({ field, text: c })
    }
  }
  return out
}

/**
 * Hodnota pole pro porovnání (prázdné hodnoty = '').
 * @param {unknown} v
 * @returns {string}
 */
function asText(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

/**
 * Pole návrhu, která se liší od záznamu (k zápisu do store). Systémová pole se ignorují.
 * @param {Object|null} entity
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, string>}
 */
export function changedFields(entity, fields) {
  const SKIP = new Set(['id', 'projectId', 'createdAt', 'updatedAt'])
  const out = {}
  for (const [k, v] of Object.entries(fields || {})) {
    if (SKIP.has(k)) continue
    const next = typeof v === 'string' ? v.trim() : asText(v)
    if (next !== asText(entity?.[k])) out[k] = next
  }
  return out
}

/**
 * Věty textu (pro odstranění duplicit při připojení).
 * @param {string} text
 * @returns {string[]}
 */
function sentences(text) {
  return String(text ?? '').match(/[^.!?…\n]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) || []
}

const norm = (s) => collapseWhitespace(String(s ?? '').toLowerCase()).text

/**
 * Záložní sloučení bez AI (když slučování selže): u textových polí připojí nové věty za stávající
 * text (věty, které už v něm jsou, vynechá), ostatní pole (výčty, krátké hodnoty) přepíše.
 * Nic stávajícího se neztratí.
 * @param {Object|null} entity
 * @param {Record<string, unknown>} fields - nové informace
 * @param {{ textKeys?: Iterable<string> }} [options] - textKeys: dlouhá textová pole (připojují se)
 * @returns {Record<string, string>} hodnoty změněných polí
 */
export function fallbackMerge(entity, fields, { textKeys = [] } = {}) {
  const append = new Set(textKeys)
  const merged = {}
  for (const [k, v] of Object.entries(fields || {})) {
    const next = asText(v)
    const prev = asText(entity?.[k])
    if (!next) continue
    if (!prev || !append.has(k)) {
      merged[k] = next
      continue
    }
    const known = norm(prev)
    const fresh = sentences(next).filter((s) => !known.includes(norm(s)))
    if (fresh.length) merged[k] = `${prev}\n\n${fresh.join(' ')}`
  }
  return changedFields(entity, merged)
}
