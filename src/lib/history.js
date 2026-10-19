/**
 * Historie změn projektu – čisté funkce.
 *
 * Záznam historie (entry) vzniká z rozdílu stavu před a po uložení (persist):
 *   { id, projectId, at, kind: 'edit'|'revert', revertOf?, revertedBy?, changes: Change[] }
 * Change = { collection, id, before, after } – celé záznamy (before = null → vytvořeno,
 * after = null → smazáno). Vrácení záznamu aplikuje inverzní změny na aktuální stav
 * a samo se zapíše do historie jako nový záznam (kind 'revert'), takže jde vrátit i vrácení.
 *
 * Uložená historie: { [projectId]: Entry[] } (od nejstaršího), samostatně mimo data aplikace.
 */

/**
 * Pole, která se mění automaticky nebo nepatří do historie (chat zápisníku má vlastní historii;
 * rozvržení plátna `canvas` by posouváním kartiček vytlačilo skutečné změny z limitu historie).
 */
export const HISTORY_IGNORED_FIELDS = ['updatedAt', 'lastWorkedAt', '_ts', 'notebookHistory', 'notebook', 'canvas']

/** Maximální počet záznamů historie na projekt (starší se zahazují). */
export const HISTORY_LIMIT = 100

/**
 * Kopie záznamu bez ignorovaných polí.
 * @param {Object|null} record
 * @returns {Object|null}
 */
function stripIgnored(record) {
  if (!record || typeof record !== 'object') return null
  const out = {}
  for (const [k, v] of Object.entries(record)) {
    if (!HISTORY_IGNORED_FIELDS.includes(k)) out[k] = v
  }
  return out
}

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * Klíče polí, ve kterých se dva záznamy liší (bez ignorovaných polí).
 * @param {Object|null} before
 * @param {Object|null} after
 * @returns {string[]}
 */
export function changedFields(before, after) {
  const a = stripIgnored(before) || {}
  const b = stripIgnored(after) || {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].filter((k) => !sameValue(a[k], b[k]))
}

/**
 * Rozdíl dvou stavů aplikace – seznam změněných záznamů.
 * Změny jen v ignorovaných polích se nezapočítávají.
 * @param {Object} prev - stav po posledním uložení
 * @param {Object} next - aktuální stav
 * @param {string[]} collections - klíče kolekcí
 * @returns {Array<{collection: string, id: string, before: Object|null, after: Object|null}>}
 */
export function diffStates(prev, next, collections) {
  const changes = []
  for (const collection of collections) {
    const prevList = Array.isArray(prev?.[collection]) ? prev[collection] : []
    const nextList = Array.isArray(next?.[collection]) ? next[collection] : []
    const prevMap = new Map(prevList.filter((r) => r?.id).map((r) => [r.id, r]))
    const nextIds = new Set()
    for (const record of nextList) {
      if (!record?.id) continue
      nextIds.add(record.id)
      const before = prevMap.get(record.id) || null
      if (!before) {
        changes.push({ collection, id: record.id, before: null, after: clone(record) })
      } else if (changedFields(before, record).length) {
        changes.push({ collection, id: record.id, before: clone(before), after: clone(record) })
      }
    }
    for (const [id, before] of prevMap) {
      if (!nextIds.has(id)) changes.push({ collection, id, before: clone(before), after: null })
    }
  }
  return changes
}

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value))
}

/**
 * Projekty, kterých se změna týká (u přesunu mezi projekty oba).
 * @param {{collection: string, before: Object|null, after: Object|null}} change
 * @returns {string[]}
 */
export function changeProjectIds(change) {
  const ids = new Set()
  for (const r of [change?.before, change?.after]) {
    if (!r) continue
    const pid = change.collection === 'projects' ? r.id : r.projectId
    if (pid) ids.add(pid)
  }
  return [...ids]
}

/**
 * Sloučí po sobě jdoucí změny (např. více persist() v rámci jedné akce).
 * Pro každý záznam drží první `before` a poslední `after`; změny, které se vyrušily, vypadnou.
 * @param {Array} older
 * @param {Array} newer
 * @returns {Array}
 */
export function mergeChanges(older, newer) {
  const map = new Map()
  for (const c of [...(older || []), ...(newer || [])]) {
    const key = `${c.collection}:${c.id}`
    const prev = map.get(key)
    map.set(key, prev ? { ...prev, after: c.after } : { ...c })
  }
  return [...map.values()].filter((c) => {
    if (!c.before && !c.after) return false
    if (c.before && c.after) return changedFields(c.before, c.after).length > 0
    return true
  })
}

/**
 * Rozdělí změny podle projektů.
 * @param {Array} changes
 * @returns {Map<string, Array>} projectId → změny
 */
export function groupChangesByProject(changes) {
  const map = new Map()
  for (const c of changes || []) {
    for (const pid of changeProjectIds(c)) {
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid).push(c)
    }
  }
  return map
}

/**
 * Druh změny.
 * @param {{before: Object|null, after: Object|null}} change
 * @returns {'create'|'delete'|'update'}
 */
export function changeAction(change) {
  if (!change?.before) return 'create'
  if (!change?.after) return 'delete'
  return 'update'
}

/**
 * Přidá záznam do historie projektu a ořízne ji na limit.
 * @param {Object} history - { [projectId]: Entry[] }
 * @param {Object} entry
 * @param {number} [limit]
 * @returns {Object} nová historie
 */
export function appendHistoryEntry(history, entry, limit = HISTORY_LIMIT) {
  const list = Array.isArray(history?.[entry.projectId]) ? history[entry.projectId] : []
  return { ...(history || {}), [entry.projectId]: [...list, entry].slice(-limit) }
}

/**
 * Normalizuje uloženou historii (poškozená / starší data).
 * @param {unknown} raw
 * @returns {Object} { [projectId]: Entry[] }
 */
export function normalizeHistory(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [pid, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue
    const entries = list.filter((e) => e && typeof e === 'object' && e.id && Array.isArray(e.changes))
      .map((e) => ({
        ...e,
        projectId: pid,
        kind: e.kind === 'revert' ? 'revert' : 'edit',
        changes: e.changes.filter((c) => c && typeof c.collection === 'string' && c.id),
      }))
    if (entries.length) out[pid] = entries
  }
  return out
}

/**
 * Inverzní aplikace záznamu historie na aktuální stav.
 * - vytvořený záznam → smaže se (pokud ještě existuje),
 * - smazaný záznam → vrátí se (pokud mezitím nevznikl znovu),
 * - upravený záznam → změněná pole dostanou původní hodnoty (ostatní pozdější úpravy zůstanou);
 *   pokud byl mezitím smazán, vrátí se v původní podobě.
 * @param {Object} data - aktuální stav (nemění se)
 * @param {{changes: Array}} entry
 * @returns {Object} { [collection]: nové pole } – jen dotčené kolekce
 */
export function buildRevertPatch(data, entry) {
  const patch = {}
  const list = (collection) => {
    if (!patch[collection]) patch[collection] = Array.isArray(data?.[collection]) ? [...data[collection]] : []
    return patch[collection]
  }
  for (const change of entry?.changes || []) {
    const items = list(change.collection)
    const idx = items.findIndex((r) => r?.id === change.id)
    const action = changeAction(change)
    if (action === 'create') {
      if (idx !== -1) items.splice(idx, 1)
    } else if (action === 'delete') {
      if (idx === -1) items.push(clone(change.before))
    } else if (idx === -1) {
      items.push(clone(change.before))
    } else {
      const restored = { ...items[idx] }
      for (const field of changedFields(change.before, change.after)) {
        if (field in change.before) restored[field] = clone(change.before[field])
        else delete restored[field]
      }
      items[idx] = restored
    }
  }
  return patch
}

/**
 * Najde poslední záznam historie, ve kterém byl smazán celý projekt (pro obnovu smazaných projektů).
 * @param {Object} history
 * @param {Set<string>|string[]} existingProjectIds
 * @returns {Array<{projectId: string, name: string, at: string, entryId: string}>} od nejnovějšího
 */
export function getDeletedProjects(history, existingProjectIds) {
  const existing = new Set(existingProjectIds || [])
  const out = []
  for (const [pid, entries] of Object.entries(history || {})) {
    if (existing.has(pid)) continue
    for (let i = (entries || []).length - 1; i >= 0; i--) {
      const e = entries[i]
      const projectChange = e.changes.find((c) => c.collection === 'projects' && c.id === pid && !c.after && c.before)
      if (projectChange) {
        out.push({ projectId: pid, name: projectChange.before.name || '', at: e.at, entryId: e.id })
        break
      }
    }
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

/**
 * Smaže historii projektů, které už neexistují a nejsou smazané (nelze je obnovit).
 * @param {Object} history
 * @param {string[]} existingProjectIds
 * @returns {Object}
 */
export function pruneHistory(history, existingProjectIds) {
  const deleted = new Set(getDeletedProjects(history, existingProjectIds).map((d) => d.projectId))
  const existing = new Set(existingProjectIds || [])
  const out = {}
  for (const [pid, entries] of Object.entries(history || {})) {
    if (existing.has(pid) || deleted.has(pid)) out[pid] = entries
  }
  return out
}

const ACTION_WEIGHT = { delete: 3, create: 2, update: 1 }

/**
 * Zobrazitelný název záznamu (název, kód nebo text).
 * @param {Object|null} record
 * @returns {string}
 */
export function recordLabel(record) {
  if (!record) return ''
  const label = record.name || record.title || record.label || record.text || record.code || ''
  return String(label).trim()
}

/**
 * Strukturovaný popis záznamu historie pro UI (bez textů – ty dodá i18n).
 * Hlavní změna = nejzávažnější změna mimo souvislosti a samotný projekt (pokud existuje).
 * @param {{changes: Array}} entry
 * @returns {{ main: Object|null, items: Array<{collection: string, id: string, action: string, name: string, fields: string[]}> }}
 */
export function describeHistoryEntry(entry) {
  const items = (entry?.changes || []).map((c) => ({
    collection: c.collection,
    id: c.id,
    action: changeAction(c),
    name: recordLabel(c.after || c.before),
    fields: changeAction(c) === 'update' ? changedFields(c.before, c.after) : [],
  }))
  const rank = (i) => (ACTION_WEIGHT[i.action] || 0) + (i.collection === 'connections' ? 0 : 10)
    + (i.collection === 'projects' ? (i.action === 'update' ? -5 : 1) : 0)
  const main = items.reduce((best, i) => (!best || rank(i) > rank(best) ? i : best), null)
  return { main, items }
}
