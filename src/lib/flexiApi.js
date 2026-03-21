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
// Fronta s paralelním zpracováním (max 4 souběžné požadavky) + bulk endpoint
// ---------------------------------------------------------------------------

/**
 * Hromadný endpoint: POST /api/uxlog_batch
 * Tělo požadavku: [{ method, path, body? }, ...]
 * Odpověď:        [{ index, status, body? }, ...]
 *
 * Pokud API vrátí 404/405/501, přepneme automaticky na individuální požadavky.
 */
const BULK_PATH = '/api/uxlog_batch'

/** null = neznámé, true = podporováno, false = nepodporováno */
let bulkAvailable = null

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
  if (activeFetches > 0) return
  if (queue.length === 0) return

  // Pokud máme 2+ čekajících operací a bulk je dostupný, použijeme ho
  if (queue.length >= 2 && bulkAvailable !== false) {
    processBulk()
    return
  }

  // Individuální zpracování
  while (activeFetches < MAX_CONCURRENT && queue.length > 0) {
    processOne(queue.shift())
  }
}

async function processBulk() {
  activeFetches++
  const ops = queue.splice(0) // vezmi všechny čekající operace

  const bulkBody = ops.map((op) => ({
    method: op.method,
    path: op.path,
    ...(op.body !== undefined ? { body: op.body } : {}),
  }))

  let results
  try {
    const resp = await flexiRequest('POST', BULK_PATH, bulkBody)
    bulkAvailable = true
    try { results = await resp.json() } catch { results = [] }
  } catch (e) {
    // Fallback na individuální požadavky při: 404/405/501 (endpoint neexistuje),
    // TypeError (CORS blokace nebo síťová chyba – server vrátil chybu bez CORS hlaviček)
    const isNotSupported = /HTTP (404|405|501)/.test(e.message) || e instanceof TypeError
    if (isNotSupported) {
      bulkAvailable = false
      console.info('[FlexiAPI] bulk endpoint není dostupný, přepínám na individuální požadavky')
      for (let i = ops.length - 1; i >= 0; i--) queue.unshift(ops[i])
    } else {
      console.error('[FlexiAPI] bulk request selhal:', e)
    }
    activeFetches--
    drainQueue()
    return
  }

  // Zpracuj výsledky jednotlivých operací z odpovědi
  if (Array.isArray(results)) {
    for (const result of results) {
      const op = ops[result.index]
      if (!op?.onSuccess) continue
      if (result.status >= 200 && result.status < 300) {
        op.onSuccess(result.body ?? null)
      }
    }
  }

  activeFetches--
  drainQueue()
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
