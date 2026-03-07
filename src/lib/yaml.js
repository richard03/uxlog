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
export function parseYaml(text) {
  const lines = text.split('\n')
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
      return raw
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }
    return raw
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
      const match = lines[pos].slice(indent).match(/^(\w+):\s*(.*)$/)
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
    const firstMatch = afterDash.match(/^(\w+):\s*(.*)$/)
    if (firstMatch) {
      const key = firstMatch[1]
      const rest = firstMatch[2].trim()
      pos++
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
      const curMatch = lines[pos].slice(itemIndent).match(/^(\w+):\s*(.*)$/)
      if (!curMatch) break
      const key = curMatch[1]
      const rest = curMatch[2].trim()
      pos++
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
