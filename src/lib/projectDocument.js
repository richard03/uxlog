/**
 * Dokument projektu – čisté funkce.
 *
 * Režim „Dokument“ zobrazuje data projektu (všechny entity ze sekce Data) jako souvislý text:
 * název projektu (nadpis 1), sekce podle typu entity (nadpis 2), entita (nadpis 3) s krátkými
 * vlastnostmi (výběrová, krátká textová, číselná pole) a s dlouhými textovými poli jako
 * podnadpis + odstavec. Dokument se z dat vždy odvozuje – sám se neukládá; úprava textu
 * v dokumentu se zapíše přímo do příslušné entity (viz entityFieldUpdate).
 */

/**
 * Sekce dokumentu v pořadí jako v přehledu projektu (sekce Data), aktivity na konci.
 * stateKey = klíč kolekce ve state, entityType = typ v data/entities.yaml, labelKey = cesta v cs.js.
 */
export const DOCUMENT_SECTIONS = [
  { stateKey: 'personas', entityType: 'persona', labelKey: 'sections.personas' },
  { stateKey: 'scenarios', entityType: 'scenario', labelKey: 'sections.scenarios' },
  { stateKey: 'requirements', entityType: 'requirement', labelKey: 'sections.requirements' },
  { stateKey: 'hypotheses', entityType: 'hypothesis', labelKey: 'sections.hypothesis' },
  { stateKey: 'risks', entityType: 'risk', labelKey: 'sections.risks' },
  { stateKey: 'bugs', entityType: 'bug', labelKey: 'sections.bugs' },
  { stateKey: 'goals', entityType: 'goal', labelKey: 'sections.goals' },
  { stateKey: 'stakeholders', entityType: 'stakeholder', labelKey: 'sections.stakeholders' },
  { stateKey: 'competitions', entityType: 'competition', labelKey: 'sections.competition' },
  { stateKey: 'teamMembers', entityType: 'teamMember', labelKey: 'sections.team' },
  { stateKey: 'tasks', entityType: 'task', labelKey: 'sections.tasks' },
  { stateKey: 'activities', entityType: 'activity', labelKey: 'document.activities' },
]

/**
 * Pole entit, které nemají definici atributů v data/entities.yaml, ale do dokumentu patří.
 * Aktivity mají v detailu jen poznámky (description).
 */
export const DOCUMENT_EXTRA_FIELDS = {
  activity: [{ key: 'description', labelKey: 'activity.description', type: 'textarea', sortOrder: 10 }],
}

/** Typy polí, které se v dokumentu zobrazí jako podnadpis + odstavec (ostatní jako vlastnost). */
const BLOCK_TYPES = new Set(['textarea'])

/** Textové typy, které jdou upravovat přímo v textu dokumentu. */
const TEXT_TYPES = new Set(['text', 'textarea', 'url', 'email', 'tel'])

/**
 * Uloženou hodnotu převede na upravitelný text (toleruje pole a objekty z chybného importu nebo AI).
 * @param {unknown} raw
 * @returns {string}
 */
export function valueToText(raw) {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x)))
      .filter((s) => s !== '')
      .join('\n')
  }
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

/**
 * Normalizuje text zadaný v dokumentu: sjednotí konce řádků, odstraní mezery na konci řádků
 * a prázdné řádky na začátku a konci; jednořádkové pole (single) spojí do jednoho řádku.
 * @param {unknown} text
 * @param {{ single?: boolean }} [options]
 * @returns {string}
 */
export function normalizeDocumentText(text, { single = false } = {}) {
  let s = String(text ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ')
  if (single) return s.replace(/\s*\n\s*/g, ' ').trim()
  s = s.split('\n').map((line) => line.replace(/[ \t]+$/, '')).join('\n')
  return s.replace(/^\n+/, '').replace(/\n+$/, '')
}

/**
 * Je pole viditelné podle podmínky visibleWhen?
 * @param {Object} field
 * @param {Object} entity
 * @returns {boolean}
 */
function isFieldVisible(field, entity) {
  if (!field?.visibleWhen) return true
  return entity?.[field.visibleWhen.field] === field.visibleWhen.value
}

/**
 * Popisek hodnoty z nabídky (options/units); neznámá hodnota → hodnota samotná.
 * @param {Array<{ value: string, label?: string }>|undefined} options
 * @param {unknown} value
 * @returns {string}
 */
function optionLabel(options, value) {
  const found = Array.isArray(options) ? options.find((o) => o?.value === value) : null
  return found?.label ?? valueToText(value)
}

/**
 * Pole entity připravené pro dokument.
 * @param {Object} field - efektivní definice pole (getEffectiveEntityFields)
 * @param {Object} entity
 * @returns {{ key: string, label: string, type: string, block: boolean, editable: boolean, text: string, display: string, empty: boolean, value: string, unit: string, options: Array, units: Array }}
 */
export function documentField(field, entity) {
  const type = typeof field?.type === 'string' ? field.type : 'text'
  const base = {
    key: field.key,
    label: field.label || field.key,
    type,
    block: BLOCK_TYPES.has(type),
    editable: TEXT_TYPES.has(type),
    text: '',
    display: '',
    empty: true,
    value: '',
    unit: '',
    options: Array.isArray(field.options) ? field.options : [],
    units: Array.isArray(field.units) ? field.units : [],
  }
  if (field.isCustom) {
    const text = valueToText(entity?.customFields?.[field.id])
    return { ...base, text, display: text, value: text, empty: !text.trim() }
  }
  if (type === 'select') {
    const value = valueToText(entity?.[field.key])
    return { ...base, value, display: value ? optionLabel(base.options, value) : '', empty: !value }
  }
  if (type === 'number-unit') {
    const value = valueToText(entity?.[field.valueKey])
    const unit = valueToText(entity?.[field.unitKey])
    const unitLabel = unit ? optionLabel(base.units, unit) : ''
    return { ...base, value, unit, display: value ? [value, unitLabel].filter(Boolean).join(' ') : '', empty: !value.trim() }
  }
  const text = valueToText(entity?.[field.key])
  return { ...base, text, display: text, value: text, empty: !text.trim() }
}

/**
 * Je nová hodnota stejná jako uložená? Textová pole se porovnávají po normalizaci, aby pouhé
 * opuštění pole (bez úprav) neuložilo změnu do historie.
 * @param {string} type
 * @param {unknown} next
 * @param {unknown} stored
 * @returns {boolean}
 */
function sameValue(type, next, stored) {
  if (!TEXT_TYPES.has(type)) return String(next ?? '') === valueToText(stored)
  const single = type !== 'textarea'
  return normalizeDocumentText(next, { single }) === normalizeDocumentText(valueToText(stored), { single })
}

/**
 * Změny entity po úpravě pole v dokumentu, nebo null (nic se nemění / pole nejde takto uložit).
 * @param {Object} field - efektivní definice pole
 * @param {Object} entity - aktuální entita
 * @param {string} value - nová hodnota (text, hodnota selectu nebo číslo u number-unit)
 * @param {string} [unit] - jednotka u number-unit (chybí = beze změny)
 * @returns {Object|null}
 */
export function entityFieldUpdate(field, entity, value, unit) {
  if (!field || !entity) return null
  const type = field.type || 'text'
  if (field.isCustom) {
    if (sameValue(type, value, entity.customFields?.[field.id])) return null
    const next = TEXT_TYPES.has(type) ? normalizeDocumentText(value, { single: type !== 'textarea' }) : String(value ?? '')
    return { customFields: { ...(entity.customFields || {}), [field.id]: next } }
  }
  if (type === 'number-unit') {
    if (!field.valueKey || !field.unitKey) return null
    const updates = {}
    const nextValue = normalizeDocumentText(value, { single: true })
    if (nextValue !== valueToText(entity[field.valueKey])) updates[field.valueKey] = nextValue
    if (unit !== undefined && String(unit) !== valueToText(entity[field.unitKey])) updates[field.unitKey] = String(unit)
    return Object.keys(updates).length ? updates : null
  }
  if (sameValue(type, value, entity[field.key])) return null
  const next = TEXT_TYPES.has(type) ? normalizeDocumentText(value, { single: type !== 'textarea' }) : String(value ?? '')
  return { [field.key]: next }
}

/**
 * Sestaví dokument projektu z dat.
 * @param {Object} data - stav aplikace
 * @param {string} projectId
 * @param {{
 *   fields?: Object<string, Array<Object>>,
 *   sectionTitles?: Object<string, string>,
 *   meta?: Array<{ label: string, value: string }>,
 * }} [options] - fields: efektivní pole podle typu entity; sectionTitles: nadpisy sekcí podle stateKey;
 *   meta: vlastnosti projektu pod hlavním nadpisem (už přeložené)
 * @returns {{ projectId: string, title: string, meta: Array<{ label: string, value: string }>, sections: Array<Object> }|null}
 */
export function buildProjectDocument(data, projectId, { fields = {}, sectionTitles = {}, meta = [] } = {}) {
  const project = Array.isArray(data?.projects) ? data.projects.find((p) => p?.id === projectId) : null
  if (!project) return null
  const sections = []
  for (const section of DOCUMENT_SECTIONS) {
    const list = Array.isArray(data?.[section.stateKey]) ? data[section.stateKey] : []
    const defs = Array.isArray(fields[section.entityType]) ? fields[section.entityType] : []
    const items = list
      .filter((e) => e?.id && e.projectId === projectId && !(section.stateKey === 'activities' && e.dismissed))
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
      .map((e) => {
        const docFields = defs.filter((f) => f?.key && isFieldVisible(f, e)).map((f) => documentField(f, e))
        return {
          key: `${section.stateKey}:${e.id}`,
          stateKey: section.stateKey,
          entityType: section.entityType,
          id: e.id,
          code: typeof e.code === 'string' ? e.code.trim() : '',
          name: normalizeDocumentText(valueToText(e.name), { single: true }),
          props: docFields.filter((f) => !f.block),
          blocks: docFields.filter((f) => f.block),
        }
      })
    if (!items.length) continue
    sections.push({
      stateKey: section.stateKey,
      entityType: section.entityType,
      id: `doc-${section.stateKey}`,
      title: sectionTitles[section.stateKey] || section.stateKey,
      items,
    })
  }
  return {
    projectId,
    title: normalizeDocumentText(valueToText(project.name), { single: true }),
    meta: (Array.isArray(meta) ? meta : []).filter((m) => m?.label && m.value),
    sections,
  }
}

/**
 * Text do jednoho řádku Markdownu (nadpis, položka seznamu).
 * @param {string} text
 * @returns {string}
 */
function inline(text) {
  return normalizeDocumentText(text, { single: true })
}

/**
 * Dokument projektu jako Markdown: # projekt, ## sekce, ### entita, krátká pole jako seznam
 * „**Popisek:** hodnota“, dlouhá pole jako #### podnadpis + odstavec. Prázdná pole se vynechají.
 * Texty entit se nepřevádějí – uživatel v nich může Markdown sám používat.
 * @param {ReturnType<typeof buildProjectDocument>} doc
 * @param {{ untitled?: string }} [options] - untitled: název entity bez názvu
 * @returns {string}
 */
export function documentToMarkdown(doc, { untitled = '' } = {}) {
  if (!doc) return ''
  const out = []
  out.push(`# ${inline(doc.title) || untitled}`.trimEnd())
  if (doc.meta?.length) {
    out.push('', ...doc.meta.map((m) => `- **${inline(m.label)}:** ${inline(m.value)}`))
  }
  for (const section of doc.sections || []) {
    out.push('', `## ${inline(section.title)}`)
    for (const item of section.items || []) {
      const heading = [item.code, inline(item.name) || untitled].filter(Boolean).join(' ')
      out.push('', `### ${heading}`.trimEnd())
      const props = (item.props || []).filter((f) => !f.empty)
      if (props.length) out.push('', ...props.map((f) => `- **${inline(f.label)}:** ${inline(f.display)}`))
      for (const block of item.blocks || []) {
        if (block.empty) continue
        out.push('', `#### ${inline(block.label)}`, '', normalizeDocumentText(block.text))
      }
    }
  }
  return `${out.join('\n')}\n`
}

/**
 * Znak pro vyhledávání bez ohledu na velikost písmen a diakritiku. Vrací vždy jeden znak,
 * aby indexy nalezených míst odpovídaly původnímu textu.
 * @param {string} ch
 * @returns {string}
 */
function foldChar(ch) {
  const folded = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return folded.length === 1 ? folded : ch.toLowerCase().length === 1 ? ch.toLowerCase() : ch
}

/**
 * Text pro vyhledávání (malá písmena, bez diakritiky) se stejnou délkou jako originál.
 * @param {unknown} text
 * @returns {string}
 */
export function foldSearchText(text) {
  return Array.from(String(text ?? ''), foldChar).join('')
}

/**
 * Najde všechna (nepřekrývající se) místa výskytu dotazu v textu – bez ohledu na velikost písmen
 * a diakritiku. Mezery v dotazu odpovídají libovolnému bílému znaku.
 * @param {unknown} text
 * @param {unknown} query
 * @returns {Array<{ start: number, end: number }>} indexy v UTF-16 jednotkách (pro DOM Range)
 */
export function findTextMatches(text, query) {
  const q = foldSearchText(String(query ?? '').trim().replace(/\s+/g, ' '))
  if (!q) return []
  const chars = Array.from(String(text ?? ''))
  const folded = chars.map(foldChar)
  // Pozice znaků v UTF-16 (emoji a jiné znaky mimo BMP mají délku 2)
  const offsets = [0]
  for (const ch of chars) offsets.push(offsets[offsets.length - 1] + ch.length)
  const qChars = Array.from(q)
  const result = []
  let i = 0
  while (i <= folded.length - qChars.length) {
    let ok = true
    for (let j = 0; j < qChars.length; j++) {
      const c = folded[i + j]
      if (qChars[j] === ' ' ? !/\s/.test(c) : c !== qChars[j]) { ok = false; break }
    }
    if (ok) {
      result.push({ start: offsets[i], end: offsets[i + qChars.length] })
      i += qChars.length
    } else {
      i++
    }
  }
  return result
}
