/**
 * Vault – trojcestné slučování záznamu (základ / aplikace / soubor) a pojistka proti hromadné změně.
 *
 * Základ (base) = podoba záznamu z doby poslední shody aplikace se souborem (.uxlog/base.json).
 * Pro každé pole souboru:
 *   soubor = aplikace            → nic
 *   soubor = základ              → ponechá se aplikace (pole se měnilo jen v aplikaci)
 *   aplikace = základ            → převezme se soubor (pole se měnilo jen v souboru)
 *   vazby (*Ids) změněné oběma   → sloučí se jako množiny (přidání i odebrání z obou stran)
 *   jinak                        → konflikt (rozhodne uživatel)
 * Bez základu (soubor ještě nebyl v souladu – např. po aktualizaci aplikace) vyhrává soubor.
 * Čisté funkce.
 */

import { applyDefaults } from './format.js'

/** Pole, která se při slučování ignorují (nastavuje je aplikace). */
const IGNORED_FIELDS = new Set(['id', 'updatedAt', 'createdAt', 'lastWorkedAt'])

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/** Stabilní serializace pro porovnání (pořadí klíčů nehraje roli). */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isObject(value)) return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  return JSON.stringify(value ?? null)
}

const same = (a, b) => stableStringify(a) === stableStringify(b)

const isRefList = (key, ...values) => /Ids$/.test(key) && values.every((v) => v === undefined || Array.isArray(v))

/**
 * Sloučí dva seznamy id změněné proti základu: výsledek = aplikace + přidané v souboru − odebrané v souboru.
 * Pořadí: podle aplikace, nová id ze souboru na konec.
 * @param {string[]} base
 * @param {string[]} app
 * @param {string[]} file
 * @returns {string[]}
 */
export function mergeIdLists(base = [], app = [], file = []) {
  const removedInFile = new Set(base.filter((id) => !file.includes(id)))
  const out = app.filter((id) => !removedInFile.has(id))
  for (const id of file) if (!base.includes(id) && !out.includes(id)) out.push(id)
  return out
}

/**
 * Trojcestně sloučí záznam.
 * @param {{ base?: Object|null, app: Object, file: Object, defaults?: Object, excluded?: string[] }} input
 * @returns {{
 *   patch: Object,                                               pole k zápisu do aplikace (undefined = odebrat)
 *   fields: Array<{ field: string, before: unknown, after: unknown }>,   co se v aplikaci změní
 *   conflicts: Array<{ field: string, base: unknown, app: unknown, file: unknown }>,
 * }}
 */
export function mergeRecord({ base, app, file, defaults = {}, excluded = [] }) {
  const a = applyDefaults(clone(app ?? {}), defaults)
  const b = base ? applyDefaults(clone(base), defaults) : null
  const keys = new Set([...Object.keys(file ?? {}), 'extraSections'])
  const patch = {}
  const fields = []
  const conflicts = []

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key) || excluded.includes(key)) continue
    const fv = file?.[key]
    const av = a[key]
    if (key === 'extraSections' && fv === undefined && av === undefined) continue
    if (same(fv, av)) continue

    let next
    if (!b) {
      next = fv
    } else {
      const bv = b[key]
      if (same(fv, bv)) continue
      if (same(av, bv)) {
        next = fv
      } else if (isRefList(key, bv, av, fv)) {
        next = mergeIdLists(bv ?? [], av ?? [], fv ?? [])
        if (same(next, av)) continue
      } else {
        conflicts.push({ field: key, base: clone(bv), app: clone(av), file: clone(fv) })
        continue
      }
    }
    patch[key] = clone(next)
    fields.push({ field: key, before: clone(av), after: clone(next) })
  }
  return { patch, fields, conflicts }
}

/**
 * Je dávka změn nezvykle velká (pravděpodobně nehoda – synchronizace, git, smazaná složka)?
 * Pak se nenačte automaticky, ale jen přes náhled.
 * @param {Array<Object>} changes - změny z buildVaultImport
 * @param {Object} state - současná data aplikace
 * @param {{ maxDeletes: number, maxShare: number, minChanges: number }} limits
 * @returns {boolean}
 */
export function isMassChange(changes, state, limits) {
  const list = Array.isArray(changes) ? changes : []
  const deletes = list.filter((c) => c.kind === 'delete').length
  if (deletes > limits.maxDeletes) return true
  const byProject = new Map()
  for (const c of list) {
    if (c.kind !== 'delete' && c.kind !== 'update') continue
    byProject.set(c.projectId, (byProject.get(c.projectId) ?? 0) + 1)
  }
  for (const [projectId, count] of byProject) {
    if (count < limits.minChanges) continue
    let total = 0
    for (const [key, value] of Object.entries(state ?? {})) {
      if (key === 'projects' || key === 'connections' || !Array.isArray(value)) continue
      total += value.filter((r) => r?.projectId === projectId).length
    }
    if (total && count / total > limits.maxShare) return true
  }
  return false
}
