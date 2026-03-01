/**
 * Generování unikátních kódů pro entity s atributem code.
 * Formát: PREFIX-NNN (např. SCN-001, REQ-015).
 */

/** Regex pro parsování kódu ve formátu PREFIX-NNN */
const CODE_PATTERN = /^([A-Z]+)-(\d+)$/i

/**
 * Vyparsuje číselnou část z kódu ve formátu PREFIX-NNN.
 * @param {string} code - Kód položky (např. SCN-001)
 * @param {string} prefix - Očekávaná předpona (např. SCN)
 * @returns {number|null} Číslo nebo null pokud kód neodpovídá předponě
 */
function parseCodeNumber(code, prefix) {
  if (!code || typeof code !== 'string') return null
  const match = code.trim().match(CODE_PATTERN)
  if (!match) return null
  const codePrefix = match[1].toUpperCase()
  const prefixUpper = prefix.toUpperCase()
  if (codePrefix !== prefixUpper) return null
  return parseInt(match[2], 10)
}

/**
 * Vygeneruje další unikátní kód pro daný typ entity.
 * Projde existující položky, najde maximální číslo u kódů s danou předponou
 * a vrátí PREFIX-(max+1) s trojciferným paddingem.
 *
 * @param {string} prefix - Předpona kódu (GOL, HYP, PER, SCN, REQ)
 * @param {Array<{code?: string}>} items - Pole existujících položek s atributem code
 * @returns {string} Nový unikátní kód (např. SCN-001, REQ-015)
 */
export function generateNextCode(prefix, items) {
  const list = Array.isArray(items) ? items : []
  let maxNum = 0
  for (const item of list) {
    const num = parseCodeNumber(item?.code, prefix)
    if (num !== null && num > maxNum) maxNum = num
  }
  const nextNum = maxNum + 1
  const padded = String(nextNum).padStart(3, '0')
  return `${prefix.toUpperCase()}-${padded}`
}
