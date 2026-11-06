/**
 * Diktování (konektor Recognita) – čistá logika.
 *
 * - adresa živého přepisu z nastavení (`buildStreamUrl`),
 * - převod zvuku z mikrofonu na PCM s16le 16 kHz mono (`resampleTo16k`, `floatToPcm16`, `bytesToBase64`),
 * - výklad zpráv serveru a kódů zavření (`parseDictationMessage`, `closeCodeToError`),
 * - stav diktování včetně reakce na pomalý nebo ztracený server (`reduceDictation`),
 * - vložení diktovaného textu na místo kurzoru (`composeDictatedText`).
 *
 * Funkce nepracují s UI ani s i18n – chyby vracejí jako kódy (`DICTATION_ERROR`).
 */

export const DICTATION_SAMPLE_RATE = 16000

/** Délka bloku zvuku posílaného na server (doporučeno 100–500 ms). */
export const DICTATION_CHUNK_MS = 250

/** Kódy chyb diktování (texty v cs.js `dictation.errors`). */
export const DICTATION_ERROR = Object.freeze({
  NOT_CONFIGURED: 'notConfigured',
  INVALID_URL: 'invalidUrl',
  INVALID_KEY: 'invalidKey',
  UNAUTHORIZED: 'unauthorized',
  BUSY: 'busy',
  UNREACHABLE: 'unreachable',
  TIMEOUT: 'timeout',
  STALLED: 'stalled',
  CONNECTION_LOST: 'connectionLost',
  SERVER: 'server',
  NOT_FOUND: 'notFound',
  MICROPHONE: 'microphone',
  UNSUPPORTED: 'unsupported',
})

const KNOWN_ERRORS = new Set(Object.values(DICTATION_ERROR))

/** Stavy diktování. */
export const DICTATION_STATUS = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  FINISHING: 'finishing',
  ERROR: 'error',
})

/** Výchozí časové limity (přepíše je `dictation` v data/app.yaml). */
export const DEFAULT_DICTATION_TIMINGS = Object.freeze({
  connectTimeoutMs: 12000,
  slowAfterMs: 8000,
  stallAfterMs: 20000,
  finishTimeoutMs: 20000,
})

/**
 * Normalizuje základní adresu služby: doplní https://, odřízne koncová lomítka
 * a cestu k API (`/api/docs`, `/api/v1/...`), kterou uživatel mohl vložit omylem.
 * @param {unknown} raw
 * @returns {string} '' = neplatná nebo prázdná adresa
 */
export function normalizeBaseUrl(raw) {
  let s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return ''
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`
  let url
  try {
    url = new URL(s)
  } catch {
    return ''
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || !url.hostname) return ''
  let path = url.pathname.replace(/\/+$/, '')
  path = path.replace(/\/api(\/(docs|v\d+)(\/.*)?)?$/i, '')
  const protocol = url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol
  return `${protocol}//${url.host}${path}`
}

/**
 * Adresa WebSocketu živého přepisu.
 * @param {string} baseUrl
 * @param {{ language?: string, initialPrompt?: string, filename?: string }} [options]
 * @returns {string} '' = neplatná adresa
 */
export function buildStreamUrl(baseUrl, options = {}) {
  const base = normalizeBaseUrl(baseUrl)
  if (!base) return ''
  const wsBase = base.replace(/^http/i, 'ws')
  const params = new URLSearchParams()
  params.set('language', typeof options.language === 'string' ? options.language.trim() : 'cs')
  const prompt = typeof options.initialPrompt === 'string' ? options.initialPrompt.trim() : ''
  if (prompt) params.set('initial_prompt', prompt)
  const filename = typeof options.filename === 'string' ? options.filename.trim() : ''
  if (filename) params.set('filename', filename)
  return `${wsBase}/api/v1/stream?${params.toString()}`
}

/** Počáteční stav převzorkování (první výstupní vzorek = první vstupní). */
export function createResampleState() {
  return { pos: 1, tail: 0 }
}

/**
 * Převzorkuje blok zvuku na 16 kHz (lineární interpolace). Stav mezi bloky drží `state`,
 * takže navazující bloky dávají plynulý signál bez mezer.
 * @param {Float32Array|number[]} input
 * @param {number} inputRate
 * @param {{ pos: number, tail: number }} [state]
 * @returns {{ samples: Float32Array, state: { pos: number, tail: number } }}
 */
export function resampleTo16k(input, inputRate, state = createResampleState()) {
  const len = input?.length || 0
  if (!len) return { samples: new Float32Array(0), state: { ...state } }
  if (!(inputRate > 0) || inputRate === DICTATION_SAMPLE_RATE) {
    return { samples: Float32Array.from(input), state: createResampleState() }
  }
  const ratio = inputRate / DICTATION_SAMPLE_RATE
  // combined[0] = poslední vzorek předchozího bloku, combined[1..] = aktuální blok
  const at = (i) => (i === 0 ? state.tail : input[i - 1])
  const lastIndex = len // index posledního vzorku v combined
  const out = []
  let pos = Number.isFinite(state.pos) ? Math.max(0, state.pos) : 1
  while (pos < lastIndex) {
    const i = Math.floor(pos)
    const frac = pos - i
    out.push(at(i) * (1 - frac) + at(i + 1) * frac)
    pos += ratio
  }
  if (pos === lastIndex) {
    out.push(at(lastIndex))
    pos += ratio
  }
  return { samples: Float32Array.from(out), state: { pos: pos - lastIndex, tail: at(lastIndex) } }
}

/**
 * Převede vzorky -1…1 na 16bit PCM little-endian.
 * @param {Float32Array|number[]} samples
 * @returns {Uint8Array}
 */
export function floatToPcm16(samples) {
  const len = samples?.length || 0
  const bytes = new Uint8Array(len * 2)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < len; i++) {
    const v = Number.isFinite(samples[i]) ? Math.max(-1, Math.min(1, samples[i])) : 0
    view.setInt16(i * 2, v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff), true)
  }
  return bytes
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * Base64 (standardní abeceda s doplněním) – bez závislosti na btoa.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  const len = bytes?.length || 0
  let out = ''
  let i = 0
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63]
  }
  if (len - i === 1) {
    const n = bytes[i] << 16
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '=='
  } else if (len - i === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '='
  }
  return out
}

/** Počet bajtů jednoho bloku zvuku (250 ms = 8000 B). */
export function chunkByteLength(ms = DICTATION_CHUNK_MS) {
  return Math.round((DICTATION_SAMPLE_RATE * ms) / 1000) * 2
}

const str = (v) => (typeof v === 'string' ? v : '')

/**
 * Přečte zprávu serveru. Neznámé nebo poškozené zprávy vrací null (ignorují se).
 * @param {unknown} raw JSON text nebo objekt
 * @returns {null | { type: 'ready', id: string|null } | { type: 'partial', committed: string, tentative: string } | { type: 'segment', text: string } | { type: 'done', id: string|null, text: string } | { type: 'error', detail: string }}
 */
export function parseDictationMessage(raw) {
  let m = raw
  if (typeof raw === 'string') {
    try {
      m = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!m || typeof m !== 'object') return null
  const id = typeof m.id === 'string' && m.id ? m.id : null
  switch (m.type) {
    case 'ready': return { type: 'ready', id }
    case 'partial': return { type: 'partial', committed: str(m.committed), tentative: str(m.tentative) }
    case 'segment': return { type: 'segment', text: str(m.text) }
    case 'done': return { type: 'done', id, text: str(m.text) }
    case 'error': return { type: 'error', detail: str(m.detail) }
    default: return null
  }
}

/**
 * Kód chyby podle kódu zavření WebSocketu; null = řádné ukončení.
 * @param {number|null|undefined} code
 * @returns {string|null}
 */
export function closeCodeToError(code) {
  if (code === 1000) return null
  if (code === 4401) return DICTATION_ERROR.UNAUTHORIZED
  if (code === 4409) return DICTATION_ERROR.BUSY
  return DICTATION_ERROR.CONNECTION_LOST
}

/**
 * Normalizuje kód chyby (neznámý kód = obecná chyba serveru).
 * @param {unknown} code
 * @returns {string}
 */
export function normalizeDictationError(code) {
  return typeof code === 'string' && KNOWN_ERRORS.has(code) ? code : DICTATION_ERROR.SERVER
}

/**
 * Text k zobrazení z potvrzené a předběžné části.
 * @param {string} committed
 * @param {string} tentative
 * @returns {string}
 */
export function liveSpokenText(committed, tentative) {
  return [str(committed).trim(), str(tentative).trim()].filter(Boolean).join(' ')
}

/** Počáteční (nečinný) stav diktování. */
export function initialDictationState() {
  return {
    status: DICTATION_STATUS.IDLE,
    committed: '',
    tentative: '',
    /** Hotový text sezení (po done, po vypršení dokončení nebo po chybě) – null = sezení ještě běží. */
    final: null,
    /** true = text nemusí být úplný (server nedokončil přepis). */
    incomplete: false,
    error: null,
    errorDetail: '',
    /** Server dlouho neodpověděl – zobrazit upozornění, diktování běží dál. */
    slow: false,
    startedAt: 0,
    lastSeenAt: 0,
    stopRequestedAt: 0,
  }
}

function finishWithError(state, code, detail = '') {
  return {
    ...state,
    status: DICTATION_STATUS.ERROR,
    error: normalizeDictationError(code),
    errorDetail: detail,
    slow: false,
    final: liveSpokenText(state.committed, state.tentative),
    incomplete: true,
  }
}

const ACTIVE = new Set([DICTATION_STATUS.CONNECTING, DICTATION_STATUS.LISTENING, DICTATION_STATUS.FINISHING])

/**
 * Přechod stavu diktování. Události:
 * - `{ type: 'start' }` – zahájení připojování,
 * - `{ type: 'message', message }` – přečtená zpráva serveru (`parseDictationMessage`),
 * - `{ type: 'alive' }` – server odpověděl na ping,
 * - `{ type: 'stop' }` – uživatel ukončil nahrávání,
 * - `{ type: 'error', code, detail? }` – chyba spojení / mikrofonu,
 * - `{ type: 'closed', code }` – server zavřel spojení,
 * - `{ type: 'tick' }` – kontrola časových limitů.
 * Při chybě se dosud nadiktovaný text nikdy neztratí: přejde do `final`.
 * @param {ReturnType<typeof initialDictationState>} state
 * @param {Object} event
 * @param {number} now čas v ms
 * @param {typeof DEFAULT_DICTATION_TIMINGS} [timings]
 * @returns {ReturnType<typeof initialDictationState>}
 */
export function reduceDictation(state, event, now, timings = DEFAULT_DICTATION_TIMINGS) {
  const s = state || initialDictationState()
  const type = event?.type
  if (type === 'start') {
    return { ...initialDictationState(), status: DICTATION_STATUS.CONNECTING, startedAt: now, lastSeenAt: now }
  }
  if (!ACTIVE.has(s.status)) return s

  switch (type) {
    case 'alive':
      return { ...s, lastSeenAt: now, slow: false }
    case 'message': {
      const m = event.message
      if (!m) return { ...s, lastSeenAt: now, slow: false }
      const seen = { ...s, lastSeenAt: now, slow: false }
      if (m.type === 'ready') {
        return s.status === DICTATION_STATUS.CONNECTING ? { ...seen, status: DICTATION_STATUS.LISTENING } : seen
      }
      if (m.type === 'partial') {
        // Potvrzený text jen roste – starší zpráva ho nesmí zkrátit
        const committed = m.committed.length >= s.committed.length || !s.committed.startsWith(m.committed) ? m.committed : s.committed
        return { ...seen, committed, tentative: m.tentative }
      }
      if (m.type === 'done') {
        const text = m.text.trim() || liveSpokenText(s.committed, s.tentative)
        return { ...seen, status: DICTATION_STATUS.IDLE, committed: text, tentative: '', final: text, incomplete: false }
      }
      if (m.type === 'error') return { ...seen, errorDetail: m.detail }
      return seen
    }
    case 'stop':
      if (s.status === DICTATION_STATUS.CONNECTING) {
        return { ...s, status: DICTATION_STATUS.IDLE, final: liveSpokenText(s.committed, s.tentative), slow: false }
      }
      if (s.status !== DICTATION_STATUS.LISTENING) return s
      return { ...s, status: DICTATION_STATUS.FINISHING, stopRequestedAt: now, lastSeenAt: now, slow: false }
    case 'error':
      return finishWithError(s, event.code, event.detail || s.errorDetail)
    case 'closed': {
      const code = closeCodeToError(event.code)
      if (code === null || (s.status === DICTATION_STATUS.FINISHING && event.code == null)) {
        // Řádné zavření bez done (např. krátká nahrávka) – vezmi, co přišlo
        return {
          ...s,
          status: DICTATION_STATUS.IDLE,
          final: liveSpokenText(s.committed, s.tentative),
          tentative: '',
          incomplete: s.status !== DICTATION_STATUS.FINISHING,
          slow: false,
        }
      }
      return finishWithError(s, code, s.errorDetail)
    }
    case 'tick': {
      const t = { ...DEFAULT_DICTATION_TIMINGS, ...(timings || {}) }
      if (s.status === DICTATION_STATUS.CONNECTING) {
        return now - s.startedAt > t.connectTimeoutMs ? finishWithError(s, DICTATION_ERROR.TIMEOUT) : s
      }
      if (s.status === DICTATION_STATUS.FINISHING) {
        if (now - s.stopRequestedAt > t.finishTimeoutMs) {
          // Server nedokončil přepis včas – ponech dosavadní text, nic se neztratí
          return {
            ...s,
            status: DICTATION_STATUS.IDLE,
            final: liveSpokenText(s.committed, s.tentative),
            incomplete: true,
            slow: false,
          }
        }
        const slow = now - s.lastSeenAt > t.slowAfterMs
        return slow === s.slow ? s : { ...s, slow }
      }
      const silent = now - s.lastSeenAt
      if (silent > t.stallAfterMs) return finishWithError(s, DICTATION_ERROR.STALLED)
      const slow = silent > t.slowAfterMs
      return slow === s.slow ? s : { ...s, slow }
    }
    default:
      return s
  }
}

/**
 * Normalizuje časové limity z konfigurace.
 * @param {unknown} raw
 * @returns {typeof DEFAULT_DICTATION_TIMINGS}
 */
export function normalizeDictationTimings(raw) {
  const out = { ...DEFAULT_DICTATION_TIMINGS }
  if (!raw || typeof raw !== 'object') return out
  for (const key of Object.keys(out)) {
    const v = Number(raw[key])
    if (Number.isFinite(v) && v >= 1000) out[key] = Math.round(v)
  }
  return out
}

const NO_SPACE_BEFORE = /^[\s.,;:!?…)\]}»"“”]/

/**
 * Vloží diktovaný text mezi text před a za kurzorem a doplní mezery.
 * @param {{ before?: string, after?: string, spoken?: string }} parts
 * @returns {{ text: string, caret: number }} caret = pozice za vloženým textem
 */
export function composeDictatedText({ before = '', after = '', spoken = '' } = {}) {
  const b = str(before)
  const a = str(after)
  const sp = str(spoken).trim()
  if (!sp) return { text: b + a, caret: b.length }
  const lead = b && !/\s$/.test(b) ? ' ' : ''
  const trail = a && !NO_SPACE_BEFORE.test(a) ? ' ' : ''
  const head = b + lead + sp
  return { text: head + trail + a, caret: head.length }
}
