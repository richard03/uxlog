/**
 * Flexi API – synchronizační logika.
 *
 * Záměrně NEimportuje state.js, aby nevznikla cirkulární závislost:
 *   state.js → registry.js (emit)
 *   registry → flexi plugin → flexiSync.js → flexiApi.js (HTTP)
 *   Nikde: flexiSync.js → state.js
 *
 * State je předáván jako parametr do initFlexiSync().
 *
 * Konflikty se řeší pomocí timestampů uložených v uxlog_sync_ts:
 *   { entityType: { id: timestamp_ms } }
 * Každý záznam posílaný do API dostane pole _ts (timestamp poslední lokální změny)
 * a _uxlog_id (naše UUID id) pro spolehlivé párování i když API přiřadí vlastní id.
 * Pokud API vrátí záznam s vyšším _ts, považuje se API za novější → přepíše lokál.
 *
 * Mapování API id → naše UUID je uloženo v uxlog_api_id_map:
 *   { entityType: { uxlogId: apiAssignedId } }
 * Toto mapování se používá pro PUT/DELETE, kde API vyžaduje své vlastní id v URL.
 *
 * Namísto přímého importu recordApiSync() používá emitter nastavený přes setEmitter().
 */

import { isFlexiEnabled, flexiRequest, enqueue } from './flexiApi.js'
import { pickNewer } from '../../storage.js'

// ---------------------------------------------------------------------------
// Emitter – náhrada přímého importu recordApiSync z dataStatus
// ---------------------------------------------------------------------------

/** @type {Function} Emitter function, set by plugin install */
let _emitSyncWrite = () => {}

/**
 * Nastaví emitter funkci volanou po úspěšném zápisu do API.
 * Flexi plugin ji nastaví na ctx.emit('sync:api-write').
 * @param {Function} fn
 */
export function setEmitter(fn) {
  _emitSyncWrite = fn
}

// ---------------------------------------------------------------------------
// Tombstone mechanismus – zabraňuje návratu lokálně smazaných entit z API
// ---------------------------------------------------------------------------

const TOMBSTONE_KEY = 'uxlog_tombstones'
/** Platnost tombstone záznamu: 30 dní. */
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000

function loadTombstones() {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveTombstones(ts) {
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(ts))
  } catch (e) {
    console.error('[FlexiSync] saveTombstones failed:', e)
  }
}

function cleanExpiredTombstones(tombstones) {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS
  let changed = false
  for (const entityType of Object.keys(tombstones)) {
    for (const [id, ts] of Object.entries(tombstones[entityType])) {
      if (ts < cutoff) {
        delete tombstones[entityType][id]
        changed = true
      }
    }
  }
  return changed
}

/**
 * Zaregistruje smazané entity do tombstone listu.
 * Voláno z flexi pluginu při události data:persisted.
 * @param {{ [entityType: string]: string[] }} deleted
 */
export function addTombstones(deleted) {
  const tombstones = loadTombstones()
  const now = Date.now()
  let changed = false
  for (const [entityType, ids] of Object.entries(deleted)) {
    if (!ids.length) continue
    if (!tombstones[entityType]) tombstones[entityType] = {}
    for (const id of ids) {
      tombstones[entityType][id] = now
      changed = true
    }
  }
  if (changed) {
    console.debug('[FlexiSync] addTombstones:', deleted)
    saveTombstones(tombstones)
  }
}

/** Entity synchronizované do Flexi API. */
export const SYNCABLE_ENTITIES = [
  'projects', 'goals', 'stakeholders', 'competitions', 'hypotheses',
  'personas', 'scenarios', 'requirements', 'activities', 'teamMembers',
  'tasks', 'bugs', 'connections',
]

/**
 * Vrátí cestu k API kolekci pro daný typ entity.
 * Prefix uxlog_ zabraňuje kolizi s rezervovanými slovy databáze (connections, users, …).
 */
function apiPath(entityType) {
  return `/api/uxlog_${entityType}`
}

const SYNC_TS_KEY = 'uxlog_sync_ts'
const API_ID_MAP_KEY = 'uxlog_api_id_map'
const LAST_FETCH_TS_KEY = 'uxlog_last_fetch_ts'
const CHECKSUMS_KEY = 'uxlog_sync_checksums'

// ---------------------------------------------------------------------------
// Metadata timestampů
// ---------------------------------------------------------------------------

/** @returns {{ [entityType: string]: { [id: string]: number } }} */
function loadSyncTs() {
  try {
    const raw = localStorage.getItem(SYNC_TS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveSyncTs(ts) {
  try {
    localStorage.setItem(SYNC_TS_KEY, JSON.stringify(ts))
  } catch (e) {
    console.error('[FlexiSync] saveSyncTs failed:', e)
  }
}

// ---------------------------------------------------------------------------
// Timestamp posledního úspěšného GET pro každý typ entity (pro parametr since)
// ---------------------------------------------------------------------------

/** @returns {{ [entityType: string]: number }} */
function loadLastFetchTs() {
  try {
    const raw = localStorage.getItem(LAST_FETCH_TS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLastFetchTs(ts) {
  try {
    localStorage.setItem(LAST_FETCH_TS_KEY, JSON.stringify(ts))
  } catch (e) {
    console.error('[FlexiSync] saveLastFetchTs failed:', e)
  }
}

// ---------------------------------------------------------------------------
// Checksums – umožňují přeskočit GET pokud se data nezměnila
// ---------------------------------------------------------------------------

/** @returns {{ [entityType: string]: string }} */
function loadChecksums() {
  try {
    const raw = localStorage.getItem(CHECKSUMS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveChecksums(checksums) {
  try {
    localStorage.setItem(CHECKSUMS_KEY, JSON.stringify(checksums))
  } catch (e) {
    console.error('[FlexiSync] saveChecksums failed:', e)
  }
}

/**
 * Pokusí se stáhnout kontrolní součty z API.
 * Endpoint GET /api/uxlog_checksum vrací { entityType: hash, ... }.
 * Při chybě (endpoint neexistuje) vrátí null – fallback na plný GET.
 * @returns {Promise<Object|null>}
 */
async function fetchApiChecksums() {
  try {
    const resp = await flexiRequest('GET', '/api/uxlog_checksum')
    const data = await resp.json()
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Mapování API id (API může přiřadit vlastní id odlišné od našeho UUID)
// ---------------------------------------------------------------------------

/** @returns {{ [entityType: string]: { [uxlogId: string]: string|number } }} */
function loadApiIdMap() {
  try {
    const raw = localStorage.getItem(API_ID_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveApiIdMap(map) {
  try {
    localStorage.setItem(API_ID_MAP_KEY, JSON.stringify(map))
  } catch (e) {
    console.error('[FlexiSync] saveApiIdMap failed:', e)
  }
}

/**
 * Vrátí id pro použití v URL PUT/DELETE.
 * Pokud API přiřadil vlastní id, vrátí ho; jinak vrátí naše UUID.
 */
function resolveApiId(entityType, uxlogId) {
  return loadApiIdMap()[entityType]?.[uxlogId] ?? uxlogId
}

// ---------------------------------------------------------------------------
// Snapshot pro inkrementální diff
// ---------------------------------------------------------------------------

/** Snapshot stavu po posledním persist() – základ pro diff. */
let lastSnapshot = null

/**
 * Aktualizuje snapshot na daný stav (bez synchronizace).
 * Voláno z initFlexiSync po sloučení, aby diffAndSync neposílal data znovu.
 */
export function setFlexiSnapshot(state) {
  lastSnapshot = Object.fromEntries(
    SYNCABLE_ENTITIES.map((type) => [type, (state[type] || []).map((r) => ({ ...r }))]),
  )
}

// ---------------------------------------------------------------------------
// Inkrementální sync (voláno z flexi pluginu po data:persisted)
// ---------------------------------------------------------------------------

/**
 * Porovná newState s posledním snapshotem, odlišné záznamy zařadí do fronty.
 * Přidá _ts a _uxlog_id ke každému záznamu posílanému do API.
 *
 * @param {Object} newState  Raw (ne-reaktivní) stav aplikace
 */
export function diffAndSync(newState) {
  if (!isFlexiEnabled()) return

  const prev = lastSnapshot
  lastSnapshot = Object.fromEntries(
    SYNCABLE_ENTITIES.map((type) => [type, (newState[type] || []).map((r) => ({ ...r }))]),
  )

  // Při prvním volání jen nastavíme snapshot – nepotřebujeme inicializovat sync z persist()
  if (!prev) return

  const syncTs = loadSyncTs()
  const now = Date.now()
  let tsChanged = false

  for (const entityType of SYNCABLE_ENTITIES) {
    const oldMap = new Map((prev[entityType] || []).map((r) => [r.id, r]))
    const newMap = new Map((newState[entityType] || []).map((r) => [r.id, r]))
    if (!syncTs[entityType]) syncTs[entityType] = {}

    for (const [id, record] of newMap) {
      if (!oldMap.has(id)) {
        // Nový záznam
        syncTs[entityType][id] = now
        tsChanged = true
        enqueue({
          method: 'POST',
          path: apiPath(entityType),
          body: { ...record, _uxlog_id: record.id, _ts: now },
          onSuccess: (apiData) => {
            if (apiData?.id && apiData.id !== id) {
              const map = loadApiIdMap()
              if (!map[entityType]) map[entityType] = {}
              map[entityType][id] = apiData.id
              saveApiIdMap(map)
            }
            _emitSyncWrite()
          },
        })
      } else if (JSON.stringify(oldMap.get(id)) !== JSON.stringify(record)) {
        // Změněný záznam
        syncTs[entityType][id] = now
        tsChanged = true
        const apiPathId = resolveApiId(entityType, id)
        enqueue({
          method: 'PUT',
          path: `${apiPath(entityType)}/${apiPathId}`,
          body: { ...record, _uxlog_id: record.id, _ts: now },
          onSuccess: () => { _emitSyncWrite() },
        })
      }
    }

    for (const [id] of oldMap) {
      if (!newMap.has(id)) {
        delete syncTs[entityType][id]
        tsChanged = true
        const apiPathId = resolveApiId(entityType, id)
        const map = loadApiIdMap()
        if (map[entityType]?.[id]) {
          delete map[entityType][id]
          saveApiIdMap(map)
        }
        enqueue({
          method: 'DELETE',
          path: `${apiPath(entityType)}/${apiPathId}`,
          onSuccess: () => { _emitSyncWrite() },
        })
      }
    }
  }

  if (tsChanged) saveSyncTs(syncTs)
}

// ---------------------------------------------------------------------------
// Plná obousměrná synchronizace (voláno při startu a po uložení konfigurace)
// ---------------------------------------------------------------------------

/**
 * Stáhne všechna data z API a sloučí je s lokálním stavem.
 * Konflikty řeší pomocí _ts timestampů – vyšší timestamp vyhrává.
 * Záznamy existující jen lokálně → POST do API.
 * Záznamy existující jen v API → přidány lokálně.
 *
 * Párování probíhá přes _uxlog_id (naše UUID), ne přes id přiřazené API.
 *
 * @param {Object} currentState  Raw lokální stav (výstup z toRaw(getData()))
 * @param {Function} onMerge     Callback (mergedEntities: Object) → void
 *                               Voláno jen pokud API přinesl nová/novější data.
 */
export async function initFlexiSync(currentState, onMerge) {
  if (!isFlexiEnabled()) return

  const syncTs = loadSyncTs()
  const apiIdMap = loadApiIdMap()
  const tombstones = loadTombstones()

  // Vyčisti prošlé tombstone záznamy
  if (cleanExpiredTombstones(tombstones)) saveTombstones(tombstones)

  // Stáhni kontrolní součty z API (null pokud endpoint neexistuje)
  const apiChecksums = await fetchApiChecksums()
  const storedChecksums = loadChecksums()
  const lastFetchTs = loadLastFetchTs()
  const updatedChecksums = { ...storedChecksums }
  const updatedFetchTs = { ...lastFetchTs }

  const mergedUpdates = {}
  let hasLocalUpdates = false
  let tsChanged = false
  let apiIdMapChanged = false
  const now = Date.now()

  for (const entityType of SYNCABLE_ENTITIES) {
    const entityLastFetch = lastFetchTs[entityType] ?? 0

    // Zjisti, zda existují lokální změny od posledního syncu
    const tsByTypeForCheck = syncTs[entityType] ?? {}
    const hasPending = (currentState[entityType] || []).some((r) => {
      if (!r?.id) return false
      const ts = tsByTypeForCheck[r.id]
      return ts === undefined || (ts > 0 && ts > entityLastFetch)
    })

    // Přeskoč, pokud checksum odpovídá a žádné lokální změny nečekají
    if (apiChecksums !== null) {
      const same = apiChecksums[entityType] !== undefined
        && apiChecksums[entityType] === storedChecksums[entityType]
      if (same && !hasPending) {
        console.debug(`[FlexiSync] checksum shodný, přeskočen ${entityType}`)
        continue
      }
    }

    // 1. Fetch z API – s parametrem ?since=<ms> pokud máme timestamp
    const getUrl = entityLastFetch > 0
      ? `${apiPath(entityType)}?since=${entityLastFetch}`
      : apiPath(entityType)
    const usingIncremental = entityLastFetch > 0

    let apiRecords
    let apiDeletedIds = []
    try {
      const resp = await flexiRequest('GET', getUrl)
      const data = await resp.json()
      if (Array.isArray(data)) {
        apiRecords = data
      } else {
        apiRecords = data.records ?? []
        if (usingIncremental && Array.isArray(data.deleted)) {
          apiDeletedIds = data.deleted
        }
      }
      updatedFetchTs[entityType] = now
      if (apiChecksums?.[entityType] !== undefined) {
        updatedChecksums[entityType] = apiChecksums[entityType]
      }
      console.debug(`[FlexiSync] GET ${getUrl}: ${apiRecords.length} záznamů`)
    } catch (e) {
      console.warn(`[FlexiSync] GET ${getUrl} selhalo:`, e)
      continue
    }

    // Deduplicate local records by id – keep the newer of each pair
    const bestLocal = new Map()
    for (const r of (currentState[entityType] || [])) {
      if (!r?.id) continue
      bestLocal.set(r.id, bestLocal.has(r.id) ? pickNewer(bestLocal.get(r.id), r) : r)
    }
    let localArr = [...bestLocal.values()]
    const localDedupCount = (currentState[entityType]?.length ?? 0) - localArr.length
    if (localDedupCount > 0) {
      console.warn(`[FlexiSync] deduplicate local ${entityType}: odstraněno ${localDedupCount} duplikátů`)
    }
    const localMap = new Map(localArr.map((r) => [r.id, r]))

    // Klíčujeme podle _uxlog_id (naše UUID); fallback na id pro stará data bez _uxlog_id.
    const apiMap = new Map()
    for (const r of apiRecords) {
      const key = r._uxlog_id ?? r.id
      if (apiMap.has(key)) {
        const existing = apiMap.get(key)
        if ((r._ts ?? 0) >= (existing._ts ?? 0)) {
          console.warn(`[FlexiSync] API duplikát ${entityType}/${existing.id} (_uxlog_id ${key}) → DELETE`)
          enqueue({ method: 'DELETE', path: `${apiPath(entityType)}/${existing.id}` })
          apiMap.set(key, r)
        } else {
          console.warn(`[FlexiSync] API duplikát ${entityType}/${r.id} (_uxlog_id ${key}) → DELETE`)
          enqueue({ method: 'DELETE', path: `${apiPath(entityType)}/${r.id}` })
        }
      } else {
        apiMap.set(key, r)
      }
    }

    if (!syncTs[entityType]) syncTs[entityType] = {}
    if (!apiIdMap[entityType]) apiIdMap[entityType] = {}
    const tsByType = syncTs[entityType]
    const idMapByType = apiIdMap[entityType]
    let entityChanged = localDedupCount > 0

    // Inkrementální mazání: API hlásí smazané id od posledního syncu
    for (const delId of apiDeletedIds) {
      if (tombstones[entityType]?.[delId]) continue
      const idx = localArr.findIndex((r) => r.id === delId)
      if (idx !== -1) {
        localArr.splice(idx, 1)
        localMap.delete(delId)
        entityChanged = true
      }
    }

    // 2. Záznamy z API
    for (const [uxlogId, apiRecord] of apiMap) {
      const { _ts: apiTs, _uxlog_id: _ignored, id: apiAssignedId, ...restFields } = apiRecord
      const apiData = { id: uxlogId, ...restFields }

      if (apiAssignedId !== undefined && String(apiAssignedId) !== String(uxlogId)) {
        idMapByType[uxlogId] = apiAssignedId
        apiIdMapChanged = true
      }

      const localRecord = localMap.get(uxlogId)
      const localTs = tsByType[uxlogId] ?? 0

      // Tombstone: entita byla lokálně záměrně smazána → smaž ji z API
      if (tombstones[entityType]?.[uxlogId]) {
        const deleteApiId = idMapByType[uxlogId] ?? (apiAssignedId !== undefined ? apiAssignedId : uxlogId)
        console.info(`[FlexiSync] tombstone ${entityType}/${uxlogId} → DELETE z API`)
        enqueue({ method: 'DELETE', path: `${apiPath(entityType)}/${deleteApiId}`, onSuccess: () => { _emitSyncWrite() } })
        continue
      }

      if (!localRecord) {
        localArr.push(apiData)
        localMap.set(uxlogId, apiData)
        tsByType[uxlogId] = apiTs ?? 0
        entityChanged = true
        tsChanged = true
      } else if ((apiTs ?? 0) > localTs) {
        const idx = localArr.findIndex((r) => r.id === uxlogId)
        if (idx !== -1) localArr[idx] = apiData
        tsByType[uxlogId] = apiTs ?? 0
        entityChanged = true
        tsChanged = true
      }
    }

    // 3. Lokální záznamy → API
    for (const localRecord of localArr) {
      const localId = localRecord.id
      const localTs = tsByType[localId] ?? 0
      const apiRecord = apiMap.get(localId)

      if (!apiRecord) {
        if (usingIncremental) {
          const syncedTs = tsByType[localId]
          const neverSynced = syncedTs === undefined
          const modifiedAfterSync = syncedTs !== undefined && syncedTs > 0 && syncedTs > entityLastFetch
          if (!neverSynced && !modifiedAfterSync) continue

          if (!neverSynced && modifiedAfterSync) {
            const apiPathId = idMapByType[localId] ?? localId
            enqueue({
              method: 'PUT',
              path: `${apiPath(entityType)}/${apiPathId}`,
              body: { ...localRecord, _uxlog_id: localId, _ts: syncedTs },
              onSuccess: () => { _emitSyncWrite() },
            })
            continue
          }
        }

        const ts = localTs || now
        tsByType[localId] = ts
        tsChanged = true
        enqueue({
          method: 'POST',
          path: apiPath(entityType),
          body: { ...localRecord, _uxlog_id: localId, _ts: ts },
          onSuccess: (apiData) => {
            if (apiData?.id && String(apiData.id) !== String(localId)) {
              const map = loadApiIdMap()
              if (!map[entityType]) map[entityType] = {}
              map[entityType][localId] = apiData.id
              saveApiIdMap(map)
            }
            _emitSyncWrite()
          },
        })
      } else if (localTs > (apiRecord._ts ?? 0)) {
        const apiPathId = idMapByType[localId] ?? localId
        enqueue({
          method: 'PUT',
          path: `${apiPath(entityType)}/${apiPathId}`,
          body: { ...localRecord, _uxlog_id: localId, _ts: localTs },
          onSuccess: () => { _emitSyncWrite() },
        })
      }
    }

    if (entityChanged) {
      mergedUpdates[entityType] = localArr
      hasLocalUpdates = true
    }
  }

  if (tsChanged) saveSyncTs(syncTs)
  if (apiIdMapChanged) saveApiIdMap(apiIdMap)
  saveLastFetchTs(updatedFetchTs)
  saveChecksums(updatedChecksums)

  // 4. Nastav snapshot na sloučený stav
  const mergedState = { ...currentState, ...mergedUpdates }
  setFlexiSnapshot(mergedState)

  // 5. Aplikuj změny do lokálního stavu
  if (hasLocalUpdates) {
    onMerge(mergedUpdates)
  }

  _emitSyncWrite()
}
