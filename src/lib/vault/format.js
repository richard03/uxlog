/**
 * Vault (data jako soubory) – převod entity ↔ Markdown s YAML frontmatterem.
 *
 * Soubor entity:
 *   ---
 *   id: …                ← strukturovaná pole (výčty, čísla, vazby *Ids, customFields, časy)
 *   ---
 *   # Název entity       ← pole `name`
 *
 *   ## Popis             ← textová pole (type: textarea v data/entities.yaml), nadpis = popisek pole
 *   …
 *
 * Pravidla:
 * - Textové pole jde do těla jen tehdy, když se tam dá zapsat beze ztráty (bez nadpisů H1/H2
 *   na začátku řádku, bez neuzavřeného bloku kódu, bez prázdných řádků na okrajích, bez \r).
 *   Jinak zůstane ve frontmatteru – převod tam a zpět je vždy bezeztrátový.
 * - Při čtení má neprázdná hodnota z těla přednost před frontmatterem.
 * - Nadpisy se porovnávají bez ohledu na velikost písmen a diakritiku, s popiskem i klíčem pole.
 * - Neznámé sekce (a text mezi názvem a první sekcí) se zachovají v `extraSections`.
 * - Chybějící pole se při čtení doplní z výchozích hodnot entity (factory v entities.yaml).
 * - Chyby a varování se vracejí jako kódy (texty pro uživatele patří do i18n).
 *
 * Čisté funkce bez side effects.
 */

import YAML from 'yaml'
import { ENTITY_CONFIG } from '../dataConfig.js'

/** Verze formátu vaultu – zvýšit při nekompatibilní změně a doplnit migraci. */
export const VAULT_FORMAT_VERSION = 1

/** Pole projektu, která do vaultu nepatří (rozvržení plátna má vlastní soubor, historie chatu zůstává v DB). */
export const VAULT_PROJECT_EXCLUDED_FIELDS = Object.freeze(['canvas', 'notebookHistory', 'config'])

/** Pole, která se nikdy nezapisují do frontmatteru entity (projekt určuje složka). */
const ENTITY_IMPLICIT_FIELDS = ['projectId']

/** Pole na začátku a na konci frontmatteru; ostatní v pořadí výchozích hodnot, zbytek abecedně. */
const LEADING_FIELDS = ['id', 'code']
const TRAILING_FIELDS = ['createdAt', 'updatedAt', 'lastWorkedAt']

const YAML_STRINGIFY_OPTIONS = Object.freeze({ lineWidth: 0, minContentWidth: 0 })

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/**
 * Normalizuje nadpis pro porovnání: malá písmena, bez diakritiky, bez dvojtečky a nadbytečných mezer.
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeHeading(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s:]+$/, '')
    .trim()
}

/**
 * Vytvoří funkci, která vrátí nadpis sekce pro pole entity podle jeho `labelKey`
 * (data/entities.yaml) v předaných textech i18n. Bez popisku vrátí klíč pole.
 * Texty se předávají parametrem, aby lib nezávisel na vrstvě i18n.
 * @param {Object} messages - např. výchozí export src/i18n/cs.js
 * @param {Object} [entityConfig]
 * @returns {(entityType: string, fieldKey: string) => string}
 */
export function createHeadingResolver(messages, entityConfig = ENTITY_CONFIG) {
  return (entityType, fieldKey) => {
    const field = (entityConfig?.[entityType]?.fields ?? []).find((f) => f?.key === fieldKey)
    const path = typeof field?.labelKey === 'string' ? field.labelKey : `${entityType}.${fieldKey}`
    const label = path.split('.').reduce((node, part) => (isObject(node) ? node[part] : undefined), messages)
    return typeof label === 'string' && isHeadingSafeText(label) ? label : fieldKey
  }
}

/**
 * Textová pole entity, která se zapisují jako sekce těla (v pořadí formuláře).
 * Entita bez definice formuláře (aktivita) má v těle `description`, pokud ho má ve výchozích hodnotách.
 * @param {string} entityType
 * @param {Object} [entityConfig]
 * @returns {string[]}
 */
export function getBodyFields(entityType, entityConfig = ENTITY_CONFIG) {
  const def = entityConfig?.[entityType]
  const fields = Array.isArray(def?.fields) ? def.fields : []
  const textareas = fields
    .filter((f) => f?.type === 'textarea' && typeof f.key === 'string' && f.key !== 'name')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((f) => f.key)
  if (textareas.length) return [...new Set(textareas)]
  return typeof def?.defaults?.description === 'string' ? ['description'] : []
}

/**
 * Lze text zapsat do těla tak, aby se přečetl beze změny?
 * @param {unknown} value
 * @param {{ allowHeadings?: boolean }} [options] - allowHeadings: tělo bez sekcí (zápisník projektu)
 * @returns {boolean}
 */
export function isBodySafeText(value, { allowHeadings = false } = {}) {
  if (typeof value !== 'string') return false
  if (value.includes('\r')) return false
  if (value !== value.trimEnd()) return false
  if (/^[ \t]*\n/.test(value)) return false
  let hasHeading = false
  const openFence = fenceStateAfter(value.split('\n'), (line, inFence) => {
    if (!inFence && /^#{1,2}(\s|$)/.test(line)) hasHeading = true
  })
  return openFence === null && (allowHeadings || !hasHeading)
}

/**
 * Projde řádky a vrátí otevřený blok kódu (``` nebo ~~~) na konci, null = všechny uzavřené.
 * Stejná logika jako v parseBody, aby zápis a čtení posuzovaly bloky kódu shodně.
 * @param {string[]} lines
 * @param {(line: string, insideFence: boolean) => void} [onLine]
 * @returns {string|null}
 */
function fenceStateAfter(lines, onLine) {
  let fence = null
  for (const line of lines) {
    const m = line.match(/^\s{0,3}(```|~~~)/)
    const wasInside = fence !== null
    if (m) {
      if (!fence) fence = m[1]
      else if (m[1] === fence) fence = null
    }
    if (onLine) onLine(line, wasInside || m !== null)
  }
  return fence
}

/**
 * Lze text zapsat jako nadpis (H1/H2) tak, aby se přečetl beze změny?
 * Jednořádkový, neprázdný, bez okrajových mezer a bez „ #“ na konci (Markdown je odřízne).
 * @param {unknown} value
 * @returns {boolean}
 */
function isHeadingSafeText(value) {
  return typeof value === 'string' && value !== '' && value === value.trim()
    && !/[\r\n]/.test(value) && !/\s#+$/.test(value) && value !== '#'.repeat(value.length)
}
const isHeadingSafeName = isHeadingSafeText

/**
 * Rozdělí soubor na YAML frontmatter a tělo. Soubor bez frontmatteru = celé tělo.
 * @param {unknown} text
 * @returns {{ frontmatter: string|null, body: string, bodyStartLine: number }}
 */
export function splitFrontmatter(text) {
  const normalized = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  if (lines[0]?.trim() !== '---') return { frontmatter: null, body: normalized, bodyStartLine: 1 }
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === '---' || t === '...') {
      return {
        frontmatter: lines.slice(1, i).join('\n'),
        body: lines.slice(i + 1).join('\n'),
        bodyStartLine: i + 2,
      }
    }
  }
  return { frontmatter: null, body: normalized, bodyStartLine: 1, unterminated: true }
}

/**
 * Naparsuje frontmatter; chyby syntaxe vrátí jako kódy s číslem řádku (v souboru).
 * @param {string|null} text
 * @returns {{ data: Object, errors: Array<Object> }}
 */
function parseFrontmatter(text) {
  if (text == null || text.trim() === '') return { data: {}, errors: [] }
  const doc = YAML.parseDocument(text, { uniqueKeys: true, prettyErrors: true })
  if (doc.errors.length) {
    return {
      data: {},
      errors: doc.errors.map((e) => ({
        code: 'yamlSyntax',
        message: String(e.message ?? '').split('\n')[0],
        line: (e.linePos?.[0]?.line ?? 0) + 1, // +1 za úvodní „---“
      })),
    }
  }
  const data = doc.toJS()
  if (data == null) return { data: {}, errors: [] }
  if (!isObject(data)) return { data: {}, errors: [{ code: 'frontmatterNotMap', line: 2 }] }
  return { data, errors: [] }
}

/** Je řádek nadpisem dané úrovně? Vrátí text nadpisu (bez uzavíracích #), jinak null. */
function headingText(line, level) {
  const m = line.match(level === 1 ? /^#(?:[ \t]+(.*?))?[ \t]*$/ : /^##(?:[ \t]+(.*?))?[ \t]*$/)
  if (!m) return null
  return (m[1] ?? '').replace(/[ \t]+#+$/, '').trim()
}

/** Ořízne prázdné řádky na začátku a mezery na konci obsahu sekce. */
function trimSection(lines) {
  return lines.join('\n').replace(/^(?:[ \t]*\n)+/, '').trimEnd()
}

/**
 * Rozdělí tělo na název (H1 jako první neprázdný řádek), úvod a sekce H2.
 * Nadpisy uvnitř bloků kódu se ignorují.
 * @param {string} body
 * @param {{ sections?: boolean }} [options] - sections: false → vše za H1 je jeden text (zápisník)
 * @returns {{ name: string|null, preamble: string, sections: Array<{ heading: string, content: string }> }}
 */
export function parseBody(body, { sections: splitSections = true } = {}) {
  const lines = String(body ?? '').split('\n')
  let i = 0
  while (i < lines.length && lines[i].trim() === '') i++
  let name = null
  if (i < lines.length) {
    const h1 = headingText(lines[i], 1)
    if (h1 !== null) {
      name = h1
      i++
    }
  }
  const rest = lines.slice(i)
  if (!splitSections) return { name, preamble: trimSection(rest), sections: [] }

  const preambleLines = []
  const sections = []
  let current = null
  fenceStateAfter(rest, (line, inFence) => {
    const h2 = inFence ? null : headingText(line, 2)
    if (h2 !== null) {
      current = { heading: h2, lines: [] }
      sections.push(current)
    } else if (current) {
      current.lines.push(line)
    } else {
      preambleLines.push(line)
    }
  })
  return {
    name,
    preamble: trimSection(preambleLines),
    sections: sections.map((s) => ({ heading: s.heading, content: trimSection(s.lines) })),
  }
}

/**
 * Seřadí klíče frontmatteru: id, code, pořadí výchozích hodnot, ostatní abecedně, časová razítka.
 * @param {Object} data
 * @param {string[]} defaultOrder
 * @returns {Object}
 */
function orderKeys(data, defaultOrder) {
  const keys = Object.keys(data)
  const leading = LEADING_FIELDS.filter((k) => keys.includes(k))
  const trailing = TRAILING_FIELDS.filter((k) => keys.includes(k))
  const fixed = new Set([...leading, ...trailing])
  const byDefaults = defaultOrder.filter((k) => keys.includes(k) && !fixed.has(k))
  const known = new Set([...fixed, ...byDefaults])
  const others = keys.filter((k) => !known.has(k)).sort()
  const out = {}
  for (const k of [...leading, ...byDefaults, ...others, ...trailing]) out[k] = data[k]
  return out
}

/**
 * Vytvoří YAML frontmatter; položky polí vazeb (*Ids) a zadaných klíčů s id doplní komentářem
 * s čitelným popisem odkazované entity (komentáře se při čtení ignorují).
 * @param {Object} data
 * @param {(id: string) => string|null} [refLabel]
 * @param {string[]} [refKeys] - další skalární klíče s id (např. entityId1 u souvislostí)
 * @returns {string}
 */
function stringifyFrontmatter(data, refLabel, refKeys = []) {
  const doc = new YAML.Document(data)
  if (typeof refLabel === 'function') annotateRefs(doc.contents, refLabel, refKeys)
  return Object.keys(data).length ? doc.toString(YAML_STRINGIFY_OPTIONS).trimEnd() : ''
}

/** Jednořádkový komentář (bez nových řádků, aby nerozbil YAML). */
function commentText(label) {
  const text = String(label ?? '').replace(/\s+/g, ' ').trim()
  return text ? ` ${text}` : null
}

/** Rekurzivně doplní komentáře k id v polích *Ids a v klíčích refKeys. */
function annotateRefs(node, refLabel, refKeys) {
  if (YAML.isMap(node)) {
    for (const pair of node.items) {
      const key = YAML.isScalar(pair.key) ? String(pair.key.value) : ''
      if (/Ids$/.test(key) && YAML.isSeq(pair.value)) {
        for (const item of pair.value.items) {
          if (YAML.isScalar(item) && typeof item.value === 'string') {
            const c = commentText(refLabel(item.value))
            if (c) item.comment = c
          }
        }
      } else if (refKeys.includes(key) && YAML.isScalar(pair.value) && typeof pair.value.value === 'string') {
        const c = commentText(refLabel(pair.value.value))
        if (c) pair.value.comment = c
      } else {
        annotateRefs(pair.value, refLabel, refKeys)
      }
    }
  } else if (YAML.isSeq(node)) {
    for (const item of node.items) annotateRefs(item, refLabel, refKeys)
  }
}

/** Složí soubor z frontmatteru a těla. */
function composeFile(frontmatter, bodyParts) {
  const body = bodyParts.join('\n\n').trimEnd()
  return `---\n${frontmatter ? `${frontmatter}\n` : ''}---\n${body ? `\n${body}\n` : ''}`
}

/**
 * Doplní chybějící pole z výchozích hodnot a sjednotí typy podle nich
 * (číslo/boolean v textovém poli → text, null/skalár v poli seznamu → seznam,
 * null nebo prázdný seznam v mapě → {}). Hodnotu, kterou nejde převést beze ztráty, nechá být.
 * @param {Object} data
 * @param {Object} defaults
 * @returns {Object}
 */
export function applyDefaults(data, defaults) {
  const out = { ...clone(defaults ?? {}), ...data }
  for (const [key, def] of Object.entries(defaults ?? {})) {
    if (!(key in data)) continue
    const v = out[key]
    if (typeof def === 'string' && (typeof v === 'number' || typeof v === 'boolean')) out[key] = String(v)
    else if (typeof def === 'string' && v === null) out[key] = ''
    else if (Array.isArray(def) && !Array.isArray(v)) out[key] = v == null || v === '' ? [] : [v]
    else if (isObject(def) && (v == null || v === '' || (Array.isArray(v) && v.length === 0))) out[key] = {}
  }
  for (const key of ['id', 'code']) {
    if (typeof out[key] === 'number') out[key] = String(out[key])
  }
  for (const [key, v] of Object.entries(out)) {
    if (/Ids$/.test(key) && Array.isArray(v)) {
      out[key] = v.filter((x) => x != null && x !== '').map(String)
    }
  }
  return out
}

/**
 * Převede entitu na obsah souboru .md.
 * @param {string} entityType - např. 'persona'
 * @param {Object} entity
 * @param {{
 *   headingFor?: (entityType: string, fieldKey: string) => string,
 *   refLabel?: (id: string) => string|null,
 *   entityConfig?: Object,
 * }} [options] - headingFor: popisek sekce (výchozí = klíč pole); refLabel: popis odkazované entity
 * @returns {string}
 */
export function entityToMarkdown(entityType, entity, options = {}) {
  const { headingFor = (_t, key) => key, refLabel, entityConfig = ENTITY_CONFIG } = options
  const source = isObject(entity) ? entity : {}
  const bodyFields = getBodyFields(entityType, entityConfig)
  const front = {}
  const sections = []

  const nameInBody = isHeadingSafeName(source.name)
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || ENTITY_IMPLICIT_FIELDS.includes(key) || key === 'extraSections') continue
    if (key === 'name' && nameInBody) continue
    if (bodyFields.includes(key) && isBodySafeText(value)) continue
    front[key] = value
  }
  for (const key of bodyFields) {
    const value = key in source ? source[key] : ''
    if (value === undefined || value === '' || isBodySafeText(value)) {
      sections.push(`## ${headingFor(entityType, key) || key}${value ? `\n\n${value}` : ''}`)
    }
  }

  // Neznámé sekce: úvod (bez nadpisu, jen první) a sekce s nadpisem jdou do těla, co by se
  // nepřečetlo beze změny (nebo by se přečetlo jako známé pole), zůstane ve frontmatteru.
  const knownHeadings = new Set(bodyFields.flatMap((k) => [normalizeHeading(k), normalizeHeading(headingFor(entityType, k))]))
  const extras = Array.isArray(source.extraSections) ? source.extraSections.filter(isObject) : []
  let preamble = null
  const extraSections = []
  const unsafeExtras = []
  for (const s of extras) {
    const content = s.content ?? ''
    if (!s.heading && !preamble && content && isBodySafeText(content)) {
      preamble = content
    } else if (isHeadingSafeText(s.heading) && !knownHeadings.has(normalizeHeading(s.heading)) && isBodySafeText(content)) {
      extraSections.push(`## ${s.heading}${content ? `\n\n${content}` : ''}`)
    } else {
      unsafeExtras.push(s)
    }
  }
  if (unsafeExtras.length) front.extraSections = unsafeExtras

  const defaultOrder = Object.keys(entityConfig?.[entityType]?.defaults ?? {})
  const frontmatter = stringifyFrontmatter(orderKeys(front, defaultOrder), refLabel)
  const parts = []
  if (nameInBody) parts.push(`# ${source.name}`)
  if (preamble) parts.push(preamble)
  parts.push(...sections, ...extraSections)
  return composeFile(frontmatter, parts)
}

/**
 * Přečte entitu ze souboru .md.
 * @param {string} entityType
 * @param {unknown} text
 * @param {{ headingFor?: Function, entityConfig?: Object, applyDefaults?: boolean }} [options]
 * @returns {{ ok: true, entity: Object, warnings: Array<Object> } | { ok: false, errors: Array<Object>, warnings: Array<Object> }}
 */
export function markdownToEntity(entityType, text, options = {}) {
  const { headingFor = (_t, key) => key, entityConfig = ENTITY_CONFIG, applyDefaults: withDefaults = true } = options
  const warnings = []
  const split = splitFrontmatter(text)
  if (split.unterminated) return { ok: false, errors: [{ code: 'frontmatterUnterminated', line: 1 }], warnings }
  const { data: front, errors } = parseFrontmatter(split.frontmatter)
  if (errors.length) return { ok: false, errors, warnings }

  const bodyFields = getBodyFields(entityType, entityConfig)
  const headingMap = new Map()
  for (const key of bodyFields) {
    headingMap.set(normalizeHeading(key), key)
    headingMap.set(normalizeHeading(headingFor(entityType, key)), key)
  }

  const parsed = parseBody(split.body)
  const entity = { ...front }
  for (const key of ENTITY_IMPLICIT_FIELDS) delete entity[key]

  if (parsed.name !== null) {
    if (parsed.name && typeof front.name === 'string' && front.name && front.name !== parsed.name) {
      warnings.push({ code: 'duplicateField', field: 'name' })
    }
    if (parsed.name || !('name' in front)) entity.name = parsed.name
  }

  const extraSections = Array.isArray(front.extraSections) ? front.extraSections.filter(isObject) : []
  if (parsed.preamble) extraSections.unshift({ heading: '', content: parsed.preamble })
  const seen = new Set()
  for (const section of parsed.sections) {
    const key = headingMap.get(normalizeHeading(section.heading))
    if (!key || seen.has(key)) {
      if (key) warnings.push({ code: 'duplicateSection', field: key })
      extraSections.push({ heading: section.heading, content: section.content })
      continue
    }
    seen.add(key)
    const fromFront = front[key]
    if (section.content || !(key in front)) {
      if (section.content && typeof fromFront === 'string' && fromFront && fromFront !== section.content) {
        warnings.push({ code: 'duplicateField', field: key })
      }
      entity[key] = section.content
    }
  }
  if (extraSections.length) entity.extraSections = extraSections
  else delete entity.extraSections

  if (entity.id == null || entity.id === '') warnings.push({ code: 'missingId' })
  const defaults = entityConfig?.[entityType]?.defaults ?? {}
  return { ok: true, entity: withDefaults ? applyDefaults(entity, defaults) : entity, warnings }
}

/**
 * Převede projekt na obsah souboru project.md (H1 = název, tělo = zápisník).
 * @param {Object} project
 * @param {{ entityConfig?: Object }} [options]
 * @returns {string}
 */
export function projectToMarkdown(project, options = {}) {
  const { entityConfig = ENTITY_CONFIG } = options
  const source = isObject(project) ? project : {}
  const nameInBody = isHeadingSafeName(source.name)
  const notebook = source.notebook ?? ''
  // Bez H1 by první řádek zápisníku „# …“ přečetl jako název
  const notebookInBody = notebook === '' || (isBodySafeText(notebook, { allowHeadings: true })
    && (nameInBody || !/^#(\s|$)/.test(notebook)))
  const front = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || VAULT_PROJECT_EXCLUDED_FIELDS.includes(key)) continue
    if (key === 'name' && nameInBody) continue
    if (key === 'notebook' && notebookInBody) continue
    front[key] = value
  }
  const defaultOrder = Object.keys(entityConfig?.project?.defaults ?? {})
  const parts = []
  if (nameInBody) parts.push(`# ${source.name}`)
  if (notebookInBody && notebook) parts.push(notebook)
  return composeFile(stringifyFrontmatter(orderKeys(front, defaultOrder)), parts)
}

/**
 * Přečte projekt ze souboru project.md. Pole vyřazená z vaultu (plátno, historie chatu) nevrací.
 * @param {unknown} text
 * @param {{ entityConfig?: Object, applyDefaults?: boolean }} [options]
 * @returns {{ ok: true, project: Object, warnings: Array<Object> } | { ok: false, errors: Array<Object>, warnings: Array<Object> }}
 */
export function markdownToProject(text, options = {}) {
  const { entityConfig = ENTITY_CONFIG, applyDefaults: withDefaults = true } = options
  const warnings = []
  const split = splitFrontmatter(text)
  if (split.unterminated) return { ok: false, errors: [{ code: 'frontmatterUnterminated', line: 1 }], warnings }
  const { data: front, errors } = parseFrontmatter(split.frontmatter)
  if (errors.length) return { ok: false, errors, warnings }

  const project = { ...front }
  for (const key of VAULT_PROJECT_EXCLUDED_FIELDS) delete project[key]
  const parsed = parseBody(split.body, { sections: false })
  if (parsed.name !== null && (parsed.name || !('name' in front))) {
    if (parsed.name && typeof front.name === 'string' && front.name && front.name !== parsed.name) {
      warnings.push({ code: 'duplicateField', field: 'name' })
    }
    project.name = parsed.name
  }
  if (parsed.preamble || !('notebook' in front)) project.notebook = parsed.preamble

  if (project.id == null || project.id === '') warnings.push({ code: 'missingId' })
  const defaults = clone(entityConfig?.project?.defaults ?? {})
  for (const key of VAULT_PROJECT_EXCLUDED_FIELDS) delete defaults[key]
  return { ok: true, project: withDefaults ? applyDefaults(project, defaults) : project, warnings }
}

/**
 * Převede souvislosti projektu na connections.yaml (bez projectId, s komentáři u odkazů).
 * @param {Array<Object>} connections
 * @param {{ refLabel?: (id: string) => string|null }} [options]
 * @returns {string}
 */
export function connectionsToYaml(connections, options = {}) {
  const list = (Array.isArray(connections) ? connections : [])
    .filter(isObject)
    .map((c) => {
      const out = { ...c }
      delete out.projectId
      return orderKeys(out, ['entityType1', 'entityId1', 'entityType2', 'entityId2', 'note'])
    })
  return `${stringifyFrontmatter({ connections: list }, options.refLabel, ['entityId1', 'entityId2'])}\n`
}

/**
 * Přečte souvislosti z connections.yaml. Neplatné položky vynechá s varováním.
 * @param {unknown} text
 * @returns {{ ok: true, connections: Array<Object>, warnings: Array<Object> } | { ok: false, errors: Array<Object>, warnings: Array<Object> }}
 */
export function yamlToConnections(text) {
  const warnings = []
  const doc = YAML.parseDocument(String(text ?? '').replace(/^﻿/, ''), { uniqueKeys: true, prettyErrors: true })
  if (doc.errors.length) {
    return {
      ok: false,
      errors: doc.errors.map((e) => ({ code: 'yamlSyntax', message: String(e.message ?? '').split('\n')[0], line: e.linePos?.[0]?.line ?? 0 })),
      warnings,
    }
  }
  const data = doc.toJS()
  const raw = Array.isArray(data) ? data : Array.isArray(data?.connections) ? data.connections : []
  if (data != null && !Array.isArray(data) && !isObject(data)) warnings.push({ code: 'connectionsNotList' })
  const connections = []
  raw.forEach((item, index) => {
    const valid = isObject(item)
      && ['entityType1', 'entityId1', 'entityType2', 'entityId2'].every((k) => item[k] != null && item[k] !== '')
    if (!valid) {
      warnings.push({ code: 'invalidConnection', index })
      return
    }
    const c = { ...item }
    delete c.projectId
    for (const k of ['id', 'entityId1', 'entityId2']) if (c[k] != null) c[k] = String(c[k])
    if (c.note == null) c.note = ''
    if (c.id == null || c.id === '') warnings.push({ code: 'missingId', index })
    connections.push(c)
  })
  return { ok: true, connections, warnings }
}

/**
 * Převede libovolná data (rozvržení plátna, metadata vaultu) na YAML.
 * @param {unknown} value
 * @returns {string}
 */
export function dataToYaml(value) {
  return `${new YAML.Document(value ?? null).toString(YAML_STRINGIFY_OPTIONS).trimEnd()}\n`
}

/**
 * Přečte YAML datový soubor.
 * @param {unknown} text
 * @returns {{ ok: true, data: unknown } | { ok: false, errors: Array<Object> }}
 */
export function yamlToData(text) {
  const doc = YAML.parseDocument(String(text ?? '').replace(/^﻿/, ''), { prettyErrors: true })
  if (doc.errors.length) {
    return { ok: false, errors: doc.errors.map((e) => ({ code: 'yamlSyntax', message: String(e.message ?? '').split('\n')[0], line: e.linePos?.[0]?.line ?? 0 })) }
  }
  return { ok: true, data: doc.toJS() }
}
