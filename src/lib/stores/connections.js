/**
 * Store modul pro správu souvislostí mezi entitami.
 * Každá souvislost je symetrická – pokud A souvisí s B, platí i B s A.
 */

import { state, persist } from './state.js'
import { createConnection } from '../models.js'

/**
 * Vrátí všechny souvislosti pro danou entitu (z obou stran).
 * @param {string} entityType - klíč store (např. 'goals', 'personas')
 * @param {string} entityId
 * @returns {Array}
 */
export function getConnectionsFor(entityType, entityId) {
  return (state.connections ?? []).filter(
    (c) =>
      (c.entityType1 === entityType && c.entityId1 === entityId) ||
      (c.entityType2 === entityType && c.entityId2 === entityId)
  )
}

/**
 * Vrátí všechny souvislosti projektu.
 * @param {string} projectId
 * @returns {Array}
 */
export function getConnections(projectId) {
  return (state.connections ?? []).filter((c) => c.projectId === projectId)
}

/**
 * Přidá novou souvislost mezi dvěma entitami.
 * Pokud stejná souvislost již existuje, nepřidá duplicitu.
 * @param {string} projectId
 * @param {string} entityType1
 * @param {string} entityId1
 * @param {string} entityType2
 * @param {string} entityId2
 * @param {string} [note]
 * @returns {Object|null} Nová souvislost nebo null pokud již existuje
 */
export function addConnection(projectId, entityType1, entityId1, entityType2, entityId2, note = '') {
  const existing = (state.connections ?? []).find(
    (c) =>
      c.projectId === projectId &&
      ((c.entityType1 === entityType1 && c.entityId1 === entityId1 && c.entityType2 === entityType2 && c.entityId2 === entityId2) ||
       (c.entityType1 === entityType2 && c.entityId1 === entityId2 && c.entityType2 === entityType1 && c.entityId2 === entityId1))
  )
  if (existing) return null

  if (!state.connections) state.connections = []
  const conn = createConnection(projectId, entityType1, entityId1, entityType2, entityId2, note)
  state.connections.push(conn)
  persist()
  return conn
}

/**
 * Aktualizuje poznámku ke souvislosti.
 * @param {string} id
 * @param {string} note
 */
export function updateConnection(id, note) {
  const conn = (state.connections ?? []).find((c) => c.id === id)
  if (!conn) return
  conn.note = note
  persist()
}

/**
 * Smaže souvislost.
 * @param {string} id
 */
export function deleteConnection(id) {
  if (!state.connections) return
  const idx = state.connections.findIndex((c) => c.id === id)
  if (idx !== -1) {
    state.connections.splice(idx, 1)
    persist()
  }
}
