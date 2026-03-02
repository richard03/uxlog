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
