/**
 * API klíče lokálního HTTP API (Figma plugin).
 *
 * Klíč se uživateli ukáže jen při vytvoření; ukládá se jen jeho SHA-256 otisk (hex) s názvem,
 * zkráceným začátkem (pro rozpoznání v seznamu) a datem vytvoření. Rust server (`http_api.rs`)
 * čte stejný uložený klíč `uxlog_local_api_keys` a porovnává otisk tokenu z hlavičky
 * `Authorization: Bearer …`. Formát musí zůstat v souladu s `authorized_key_id` v Rustu.
 *
 * Čisté funkce bez side effects.
 */

/** Klíč úložiště (SQLite key-value), čte ho i Rust. */
export const LOCAL_API_KEYS_KEY = 'uxlog_local_api_keys'

/** Prefix vygenerovaného tokenu – pozná se podle něj, k čemu klíč patří. */
export const TOKEN_PREFIX = 'uxlog_'

/** Počet náhodných bajtů tokenu (256 bitů). */
export const TOKEN_BYTES = 32

/** Kolik znaků za prefixem se ukazuje v seznamu klíčů. */
const VISIBLE_CHARS = 6

/** Nejdelší název klíče. */
export const MAX_NAME_LENGTH = 80

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const HEX_64 = /^[0-9a-f]{64}$/

/**
 * Přečte uložené klíče; poškozená data a neplatné položky tiše vynechá.
 * @param {unknown} raw - JSON řetězec nebo objekt { keys: [...] }
 * @returns {Array<{ id: string, name: string, hash: string, prefix: string, createdAt: string }>}
 */
export function parseLocalApiKeys(raw) {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
  }
  const list = isObject(data) && Array.isArray(data.keys) ? data.keys : []
  const seen = new Set()
  const out = []
  for (const k of list) {
    if (!isObject(k) || typeof k.id !== 'string' || !k.id || seen.has(k.id)) continue
    if (typeof k.hash !== 'string' || !HEX_64.test(k.hash)) continue
    seen.add(k.id)
    out.push({
      id: k.id,
      name: typeof k.name === 'string' ? k.name : '',
      hash: k.hash,
      prefix: typeof k.prefix === 'string' ? k.prefix : '',
      createdAt: typeof k.createdAt === 'string' ? k.createdAt : '',
    })
  }
  return out
}

/**
 * Serializuje klíče pro uložení.
 * @param {Array<Object>} keys
 * @returns {string}
 */
export function serializeLocalApiKeys(keys) {
  return JSON.stringify({ keys: parseLocalApiKeys({ keys }) })
}

/**
 * Sestaví token z náhodných bajtů: `uxlog_` + hex.
 * @param {Uint8Array|number[]} bytes - aspoň TOKEN_BYTES náhodných bajtů
 * @returns {string}
 */
export function buildApiToken(bytes) {
  const list = Array.from(bytes ?? [])
  if (list.length < TOKEN_BYTES) throw new Error('Not enough random bytes')
  return TOKEN_PREFIX + list.slice(0, TOKEN_BYTES).map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('')
}

/**
 * Viditelný začátek tokenu pro seznam klíčů (zbytek se nikde neukládá).
 * @param {string} token
 * @returns {string}
 */
export function tokenDisplayPrefix(token) {
  if (typeof token !== 'string') return ''
  const start = token.startsWith(TOKEN_PREFIX) ? TOKEN_PREFIX.length : 0
  return token.slice(0, start + VISIBLE_CHARS)
}

/**
 * Upraví název klíče: oříznout, zkrátit; prázdný = výchozí.
 * @param {unknown} name
 * @param {string} fallback
 * @returns {string}
 */
export function normalizeKeyName(name, fallback) {
  const trimmed = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  return (trimmed || fallback || '').slice(0, MAX_NAME_LENGTH)
}

/**
 * Přidá klíč na konec seznamu.
 * @param {Array<Object>} keys
 * @param {{ id: string, name: string, hash: string, prefix: string, createdAt: string }} key
 * @returns {Array<Object>}
 */
export function addLocalApiKey(keys, key) {
  return parseLocalApiKeys({ keys: [...(Array.isArray(keys) ? keys : []), key] })
}

/**
 * Odebere (odvolá) klíč.
 * @param {Array<Object>} keys
 * @param {string} id
 * @returns {Array<Object>}
 */
export function removeLocalApiKey(keys, id) {
  return parseLocalApiKeys({ keys: (Array.isArray(keys) ? keys : []).filter((k) => k?.id !== id) })
}
