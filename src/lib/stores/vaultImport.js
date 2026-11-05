/**
 * Načtení potvrzených změn ze složky dat (vault) do aplikace.
 *
 * Změny připravuje čistá logika lib/vault/importChanges.js (buildVaultImport). Tady se jen zapíší
 * do stavu: nové záznamy se přidají, změněná pole přepíší, smazání jde přes deleteCanvasCards
 * (běžné delete* funkce entit včetně úklidu odkazů a plátna), souvislosti se nahradí.
 * Všechny změny jedné akce tvoří jeden záznam historie projektu (vratný).
 */

import { state, persist } from './state.js'
import { updateProject } from './projects.js'
import { deleteCanvasCards } from './canvas.js'
import { cardKey } from '../canvas.js'
import { markNextHistoryAsExternal } from './history.js'
import { getEmptyData } from '../storage.js'

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))

/**
 * Zapíše potvrzené změny do stavu aplikace. Záznam historie dostane druh „Ze složky dat“.
 * @param {Array<Object>} changes - změny z buildVaultImport (kind create/update/delete/connections)
 * @returns {{ applied: Array<Object>, skipped: Array<Object> }} skipped = změny, které nešly použít
 */
export function applyVaultChanges(changes) {
  markNextHistoryAsExternal()
  const applied = []
  const skipped = []
  const touchedProjects = new Set()

  for (const change of Array.isArray(changes) ? changes : []) {
    const list = state[change?.collection]
    switch (change?.kind) {
      case 'create': {
        if (!Array.isArray(list) || !change.record?.id || list.some((r) => r.id === change.record.id)) {
          skipped.push(change)
          break
        }
        list.push(clone(change.record))
        if (change.collection !== 'projects' && change.projectId) touchedProjects.add(change.projectId)
        applied.push(change)
        break
      }
      case 'update': {
        const idx = Array.isArray(list) ? list.findIndex((r) => r.id === change.entityId) : -1
        if (idx < 0) {
          skipped.push(change)
          break
        }
        const next = { ...list[idx] }
        for (const [key, value] of Object.entries(change.patch ?? {})) {
          if (value === undefined) delete next[key]
          else next[key] = clone(value)
        }
        list[idx] = next
        if (next.projectId) touchedProjects.add(next.projectId)
        if (change.collection === 'projects') touchedProjects.add(next.id)
        applied.push(change)
        break
      }
      case 'delete': {
        const deleted = deleteCanvasCards(change.projectId, [cardKey(change.collection, change.entityId)])
        if (deleted) {
          touchedProjects.add(change.projectId)
          applied.push(change)
        } else {
          skipped.push(change)
        }
        break
      }
      case 'connections': {
        state.connections = [
          ...(state.connections || []).filter((c) => c?.projectId !== change.projectId),
          ...clone(change.after ?? []),
        ]
        touchedProjects.add(change.projectId)
        applied.push(change)
        break
      }
      default:
        skipped.push(change)
    }
  }

  // Datum poslední práce na projektu (stejně jako při úpravě v aplikaci)
  for (const projectId of touchedProjects) {
    if (state.projects?.some((p) => p.id === projectId)) updateProject(projectId, {})
  }
  persist()
  return { applied, skipped }
}

/**
 * Nahradí data projektů stavem sestaveným ze složky dat (obnova databáze ze složky).
 * Změny jdou do historie jako „Ze složky dat“ – jeden vratný záznam na projekt.
 * @param {Object} data - projekty, kolekce entit a souvislosti (z buildRebuiltState)
 */
export function replaceStateFromVault(data) {
  markNextHistoryAsExternal()
  for (const key of Object.keys(getEmptyData())) {
    state[key] = Array.isArray(data?.[key]) ? clone(data[key]) : []
  }
  persist()
}
