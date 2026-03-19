/**
 * Flexi API – konfigurace a HTTP vrstva.
 * Neobsahuje sync logiku (ta je v flexiSync.js) aby nevznikla cirkulární závislost se state.js.
 */

const CONFIG_KEY = 'uxlog_flexi_config'

// ---------------------------------------------------------------------------
// Konfigurace
// ---------------------------------------------------------------------------

/**
 * Načte konfiguraci Flexi API z localStorage.
 * @returns {{ url: string, apiKey: string, syncEnabled: boolean }}
 */
export function loadFlexiConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : { url: '', apiKey: '', syncEnabled: true }
  } catch {
    return { url: '', apiKey: '', syncEnabled: true }
  }
}

/**
 * Uloží konfiguraci Flexi API do localStorage.
 * @param {{ url: string, apiKey: string }} config
 */
export function saveFlexiConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('[FlexiAPI] saveFlexiConfig failed:', e)
  }
}

/** Vrátí true, pokud je konektor nakonfigurován (má URL) a synchronizace je povolena. */
export function isFlexiEnabled() {
  const cfg = loadFlexiConfig()
  return !!cfg.url?.trim() && cfg.syncEnabled !== false
}

// ---------------------------------------------------------------------------
// HTTP volání
// ---------------------------------------------------------------------------

/**
 * Provede HTTP požadavek na Flexi API.
 * Vyhodí chybu při non-2xx odpovědi.
 * @param {string} method  GET | POST | PUT | DELETE
 * @param {string} path    Relativní cesta (např. /api/goals)
 * @param {Object|null} body
 * @returns {Promise<Response>}
 */
export async function flexiRequest(method, path, body = null) {
  const { url, apiKey } = loadFlexiConfig()
  const base = url.replace(/\/$/, '')

  const headers = { 'Content-Type': 'application/json' }
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }
  const options = { method, headers }
  const fullPath = path
  if (body !== null) options.body = JSON.stringify(body)

  const response = await fetch(`${base}${path}`, options)
  if (!response.ok) {
    let detail = ''
    try { detail = await response.text() } catch {}
    throw new Error(`FlexiAPI ${method} ${path} → HTTP ${response.status}${detail ? ` – ${detail}` : ''}`)
  }
  return response
}

// ---------------------------------------------------------------------------
// Fronta s paralelním zpracováním (max 4 souběžné požadavky)
// ---------------------------------------------------------------------------

/** @type {Array<{method:string, path:string, body?:Object, onSuccess?:Function}>} */
const queue = []
let activeFetches = 0
const MAX_CONCURRENT = 4

/**
 * Přidá operaci do fronty a okamžitě spustí volné sloty.
 * @param {{ method:string, path:string, body?:Object, onSuccess?:Function }} op
 */
export function enqueue(op) {
  queue.push(op)
  drainQueue()
}

function drainQueue() {
  while (activeFetches < MAX_CONCURRENT && queue.length > 0) {
    processOne(queue.shift())
  }
}

async function processOne(op) {
  activeFetches++
  try {
    const response = await flexiRequest(op.method, op.path, op.body ?? null)
    if (op.onSuccess) {
      // Pro POST předáme tělo odpovědi (API může přiřadit vlastní id)
      let data
      if (op.method === 'POST') {
        try { data = await response.json() } catch {}
      }
      op.onSuccess(data)
    }
  } catch (e) {
    console.error('[FlexiAPI] queue error:', e)
  }
  activeFetches--
  drainQueue()
}
