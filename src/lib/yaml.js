/**
 * Jednoduchý YAML serializér pro export dat aplikace.
 * Podporuje primitiva, pole a objekty. Bez externích závislostí.
 */

function yamlEscape(str) {
  if (str === '') return "''"
  if (str.includes('\n')) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n') + '"'
  }
  const specialStart = /^[\-?:,\[\]{}#&*!|>'"%@`~]/.test(str)
  const hasSpecial = /[:#,\[\]{}]/.test(str)
  const isReserved = ['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(str.toLowerCase())
  if (specialStart || hasSpecial || isReserved) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  return str
}

function serializeKV(key, value, depth) {
  const indent = '  '.repeat(depth)
  if (value === null || value === undefined) return `${indent}${key}: null`
  if (typeof value === 'boolean' || typeof value === 'number') return `${indent}${key}: ${value}`
  if (typeof value === 'string') return `${indent}${key}: ${yamlEscape(value)}`
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}${key}: []`
    return `${indent}${key}:\n${toYaml(value, depth + 1)}`
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return `${indent}${key}: {}`
  return `${indent}${key}:\n${toYaml(value, depth + 1)}`
}

function serializeArrayItem(item, depth) {
  const indent = '  '.repeat(depth)
  if (item === null || item === undefined) return `${indent}- null`
  if (typeof item === 'boolean' || typeof item === 'number') return `${indent}- ${item}`
  if (typeof item === 'string') return `${indent}- ${yamlEscape(item)}`
  if (Array.isArray(item)) {
    if (item.length === 0) return `${indent}- []`
    return `${indent}-\n${toYaml(item, depth + 1)}`
  }
  const entries = Object.entries(item)
  if (entries.length === 0) return `${indent}- {}`
  const lines = []
  entries.forEach(([k, v], i) => {
    const prefix = i === 0 ? `${indent}- ` : `${indent}  `
    if (v === null || v === undefined) {
      lines.push(`${prefix}${k}: null`)
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      lines.push(`${prefix}${k}: ${v}`)
    } else if (typeof v === 'string') {
      lines.push(`${prefix}${k}: ${yamlEscape(v)}`)
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${prefix}${k}: []`)
      } else {
        lines.push(`${prefix}${k}:`)
        lines.push(toYaml(v, depth + 2))
      }
    } else {
      const subEntries = Object.entries(v)
      if (subEntries.length === 0) {
        lines.push(`${prefix}${k}: {}`)
      } else {
        lines.push(`${prefix}${k}:`)
        lines.push(toYaml(v, depth + 2))
      }
    }
  })
  return lines.join('\n')
}

/**
 * Parsuje YAML text zpět na JavaScript objekt.
 * Podporuje podmnožinu YAML generovanou exportem aplikace.
 * @param {string} text
 * @returns {*}
 */
/**
 * Bezpečné znaky pro YAML import – pozitivní whitelist.
 * Povoleny jsou: struktura (\n \t mezera), ASCII tisknutelné, rozšířená latinka (čeština, evropské jazyky),
 * cyrilice, řečtina, Unicode písmena/čísla/diakritika/interpunkce/symboly.
 * Ostatní znaky (např. z Figmy, Jiry – zero-width, různá mezerová specifika) se odstraní nebo normalizují.
 *
 * Figma specifika:
 *   – U+2028 LINE SEPARATOR a U+2029 PARAGRAPH SEPARATOR jsou oddělovače řádků v textových vrstvách.
 *     Nekonvertují se zde na \n, protože by to rozbilo strukturu YAML (parsér dělí řádky jen na \n).
 *     Projdou proto jako kontrolní znaky a jsou převedeny na \n až v parseScalar po extrakci hodnoty.
 *   – U+000B VERTICAL TAB se v některých editorech používá jako "soft return". Stejný postup.
 *   – Odrážkové znaky (•, ‣, ●, ◦ …) jsou interpunkce (\p{P}) a projdou whitelistem, převod na „- "
 *     provede parseScalar.
 * @param {string} text
 * @returns {string}
 */
function normalizeParseInput(text) {
  let out = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  out = [...out]
    .map((char) => {
      const code = char.codePointAt(0)
      if (code === 0x0a || code === 0x09) return char
      if (code === 0x20) return char
      // Figma LINE SEPARATOR (U+2028), PARAGRAPH SEPARATOR (U+2029) a VERTICAL TAB (U+000B):
      // ponecháme je netknuté – convertuje je parseScalar po extrakci hodnoty.
      // Kdybychom je zde převedli na \n, rozbili bychom YAML linky uvnitř quoted stringů.
      if (code === 0x2028 || code === 0x2029 || code === 0x000b) return char
      if (/\p{Z}/u.test(char)) return ' '
      if (code >= 0x21 && code <= 0x7e) return char
      if (code >= 0xa0 && code <= 0x24f) return char
      if (code >= 0x370 && code <= 0x3ff) return char
      if (code >= 0x400 && code <= 0x4ff) return char
      if (/\p{L}|\p{N}|\p{M}|\p{P}|\p{S}/u.test(char)) return char
      return ''
    })
    .join('')

  return out
}

/**
 * Normalizuje Figma-specifické znaky v hodnotě skalárního řetězce.
 * Voláno po extrakci hodnoty z YAML, kdy je parsér již hotový se strukturou.
 *   – LINE SEPARATOR (U+2028), PARAGRAPH SEPARATOR (U+2029), VERTICAL TAB (U+000B) → \n
 *   – Odrážkové znaky (•, ‣, ●, ◦, ▪, ·) + případná mezera za nimi → "- "
 * @param {string} value
 * @returns {string}
 */
function normalizeFigmaValue(value) {
  return value
    .replace(/[\u2028\u2029\u000B]/g, '\n')
    .replace(/[\u2022\u2023\u25CF\u25E6\u25AA\u00B7]\s*/g, '- ')
}

export function parseYaml(text) {
  const normalized = normalizeParseInput(text)
  const lines = normalized.split('\n')
  let pos = 0

  function skipBlank() {
    while (pos < lines.length && lines[pos].trim() === '') pos++
  }

  function currentIndent() {
    if (pos >= lines.length) return -1
    return lines[pos].search(/\S/)
  }

  function parseScalar(raw) {
    if (raw === 'null') return null
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
    if (raw === "''") return ''
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return normalizeFigmaValue(
        raw
          .slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
      )
    }
    return normalizeFigmaValue(raw)
  }

  function parseValue() {
    skipBlank()
    if (pos >= lines.length) return null
    const indent = currentIndent()
    if (indent < 0) return null
    const stripped = lines[pos].slice(indent)
    if (stripped.startsWith('- ') || stripped === '-') return parseSequence(indent)
    return parseMapping(indent)
  }

  function parseMapping(indent) {
    const result = {}
    while (pos < lines.length) {
      skipBlank()
      if (pos >= lines.length) break
      const ci = currentIndent()
      if (ci < 0 || ci < indent || ci > indent) break
      const match = lines[pos].slice(indent).match(/^(\w+):\s*([\s\S]*)/)
      if (!match) break
      const key = match[1]
      const rest = match[2].trim()
      pos++
      if (rest === '') {
        skipBlank()
        if (currentIndent() > indent) result[key] = parseValue()
        else result[key] = null
      } else if (rest === '[]') {
        result[key] = []
      } else if (rest === '{}') {
        result[key] = {}
      } else {
        result[key] = parseScalar(rest)
      }
    }
    return result
  }

  function parseSequence(indent) {
    const result = []
    while (pos < lines.length) {
      skipBlank()
      if (pos >= lines.length) break
      const ci = currentIndent()
      if (ci < 0 || ci < indent || ci > indent) break
      const stripped = lines[pos].slice(indent)
      if (!stripped.startsWith('- ')) break
      const afterDash = stripped.slice(2)
      if (/^\w+:/.test(afterDash)) {
        result.push(parseArrayItem(indent))
      } else if (afterDash.trim() === '' || afterDash.trim() === 'null') {
        pos++
        result.push(null)
      } else {
        result.push(parseScalar(afterDash.trim()))
        pos++
      }
    }
    return result
  }

  function parseArrayItem(arrayIndent) {
    const itemIndent = arrayIndent + 2
    const line = lines[pos]
    const afterDash = line.slice(arrayIndent + 2)
    const result = {}
    let lastKey = null
    const firstMatch = afterDash.match(/^(\w+):\s*([\s\S]*)/)
    if (firstMatch) {
      const key = firstMatch[1]
      const rest = firstMatch[2].trim()
      pos++
      lastKey = key
      if (rest === '') {
        skipBlank()
        if (currentIndent() > itemIndent) result[key] = parseValue()
        else result[key] = null
      } else if (rest === '[]') {
        result[key] = []
      } else if (rest === '{}') {
        result[key] = {}
      } else {
        result[key] = parseScalar(rest)
      }
    } else {
      pos++
    }
    while (pos < lines.length) {
      skipBlank()
      if (pos >= lines.length) break
      if (currentIndent() !== itemIndent) break
      const curMatch = lines[pos].slice(itemIndent).match(/^(\w+):\s*([\s\S]*)/)
      if (!curMatch) {
        // Řádek bez "key: value" na stejné úrovni – může jít o pokračování předchozí hodnoty (vícerořádkový text)
        if (lastKey != null && typeof result[lastKey] === 'string') {
          result[lastKey] += '\n' + lines[pos].slice(itemIndent).trim()
          pos++
        } else {
          break
        }
      } else {
        const key = curMatch[1]
        const rest = curMatch[2].trim()
        pos++
        lastKey = key
        if (rest === '') {
          skipBlank()
          if (currentIndent() > itemIndent) result[key] = parseValue()
          else result[key] = null
        } else if (rest === '[]') {
          result[key] = []
        } else if (rest === '{}') {
          result[key] = {}
        } else {
          result[key] = parseScalar(rest)
        }
      }
    }
    return result
  }

  return parseValue()
}

export function toYaml(value, depth = 0) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return yamlEscape(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value.map(item => serializeArrayItem(item, depth)).join('\n')
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  return entries.map(([k, v]) => serializeKV(k, v, depth)).join('\n')
}
