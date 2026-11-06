/**
 * Plugin: Recognita – diktování textu hlasem (živý přepis přes WebSocket).
 *
 * Capabilities:
 * - `dictation:start(onState)` → řadič `{ stop(), abort() }`; `onState(state)` dostává stav
 *   z `reduceDictation` (lib/dictation.js) – živý text, chyby, upozornění na pomalý server,
 * - `dictation:test()` → `{ ok: boolean, error?: string }` – zkouška spojení a klíče.
 *
 * Spojení drží Rust (`dictation.rs`), proto jen v desktopové aplikaci. Najednou běží jedno
 * diktování (omezení serveru) – nové předchozí ukončí. Reakce na výpadky: časové limity
 * připojení, odmlky serveru a dokončení přepisu (`dictation` v data/app.yaml), ping každých 5 s;
 * při jakékoli chybě zůstane dosud nadiktovaný text zachovaný (`state.final`).
 */

import { APP_CONFIG } from '../../dataConfig.js'
import {
  buildStreamUrl, parseDictationMessage, reduceDictation, initialDictationState,
  DICTATION_STATUS, DICTATION_ERROR,
} from '../../dictation.js'
import {
  isTauri, dictationStart, dictationAudio, dictationStop, dictationAbort, listenToDictation,
} from '../../tauriBridge.js'
import { loadRecognitaSettings, isRecognitaConfigured, reloadRecognitaSettings } from './settings.js'
import { startMicrophone } from './microphone.js'

const TICK_MS = 500
const ACTIVE = new Set([DICTATION_STATUS.CONNECTING, DICTATION_STATUS.LISTENING, DICTATION_STATUS.FINISHING])

/** Právě běžící sezení (nejvýš jedno). */
let current = null

/**
 * Vytvoří sezení. `withMicrophone: false` = jen zkouška spojení.
 * @param {{ onState: Function, withMicrophone: boolean }} options
 */
function createSession({ onState, withMicrophone }) {
  const timings = APP_CONFIG.dictation
  let state = initialDictationState()
  let sessionId = null
  let early = [] // události, které přišly dřív, než známe id sezení
  let unlisten = null
  let mic = null
  let audioQueue = [] // bloky zvuku do příchodu `ready`
  let timer = null
  let closed = false

  function notify() {
    try {
      onState?.({ ...state })
    } catch (e) {
      console.error('[Recognita] onState failed:', e)
    }
  }

  function cleanup() {
    if (closed) return
    closed = true
    clearInterval(timer)
    mic?.stop()
    mic = null
    audioQueue = []
    unlisten?.()
    unlisten = null
    if (sessionId != null) dictationAbort(sessionId).catch(() => {})
    if (current === controller) current = null
  }

  function dispatch(event) {
    if (closed) return
    const prev = state.status
    state = reduceDictation(state, event, Date.now(), timings)
    if (prev === DICTATION_STATUS.CONNECTING && state.status === DICTATION_STATUS.LISTENING) flushAudio()
    notify()
    if (!ACTIVE.has(state.status)) cleanup()
  }

  function sendChunk(chunk) {
    if (closed || sessionId == null) return
    dictationAudio(sessionId, chunk).catch(() => dispatch({ type: 'error', code: DICTATION_ERROR.CONNECTION_LOST }))
  }

  function flushAudio() {
    const queued = audioQueue
    audioQueue = []
    queued.forEach(sendChunk)
  }

  function onChunk(chunk) {
    if (state.status === DICTATION_STATUS.LISTENING) sendChunk(chunk)
    else if (state.status === DICTATION_STATUS.CONNECTING) audioQueue.push(chunk)
    // Při dokončování se poslední blok posílá ze stop() před `end`
  }

  function handleEvent(payload) {
    if (sessionId == null) {
      early.push(payload)
      return
    }
    if (payload.session !== sessionId) return
    switch (payload.kind) {
      case 'message': {
        const message = parseDictationMessage(payload.data)
        if (message) dispatch({ type: 'message', message })
        else dispatch({ type: 'alive' })
        break
      }
      case 'alive':
        dispatch({ type: 'alive' })
        break
      case 'error':
        dispatch({ type: 'error', code: payload.code })
        break
      case 'closed':
        dispatch({ type: 'closed', code: payload.closeCode ?? null })
        break
      default:
        break
    }
  }

  const controller = {
    get state() {
      return state
    },
    async start() {
      dispatch({ type: 'start' })
      timer = setInterval(() => dispatch({ type: 'tick' }), TICK_MS)
      const settings = loadRecognitaSettings()
      if (!isTauri) return dispatch({ type: 'error', code: DICTATION_ERROR.UNSUPPORTED })
      if (!isRecognitaConfigured(settings)) return dispatch({ type: 'error', code: DICTATION_ERROR.NOT_CONFIGURED })
      const url = buildStreamUrl(settings.url, {
        language: settings.language,
        initialPrompt: settings.vocabulary,
        filename: withMicrophone ? 'UXLog – diktování' : 'UXLog – zkouška spojení',
      })
      if (!url) return dispatch({ type: 'error', code: DICTATION_ERROR.INVALID_URL })
      try {
        if (withMicrophone) {
          // Mikrofon hned – první slova se uloží do fronty, než server pošle `ready`
          mic = await startMicrophone(onChunk)
          if (closed) {
            mic.stop()
            return
          }
        }
        unlisten = await listenToDictation(handleEvent)
        if (closed) return cleanup()
        sessionId = await dictationStart(url, settings.apiKey)
        if (closed) {
          dictationAbort(sessionId).catch(() => {})
          return
        }
        const pendingEvents = early
        early = []
        pendingEvents.forEach(handleEvent)
      } catch (e) {
        const code = e?.code || (typeof e === 'string' ? e : DICTATION_ERROR.UNREACHABLE)
        dispatch({ type: 'error', code })
      }
    },
    /** Ukončí nahrávání; server dopřepíše zbytek. */
    stop() {
      if (closed) return
      if (state.status === DICTATION_STATUS.LISTENING) {
        mic?.stop() // odešle poslední blok
        mic = null
        dispatch({ type: 'stop' })
        if (sessionId != null) {
          dictationStop(sessionId).catch(() => dispatch({ type: 'error', code: DICTATION_ERROR.CONNECTION_LOST }))
        }
      } else {
        dispatch({ type: 'stop' })
      }
    },
    /** Okamžitě ukončí sezení; dosavadní text zůstane ve `final`. */
    abort() {
      if (closed) return
      if (ACTIVE.has(state.status)) {
        state = { ...state, status: DICTATION_STATUS.IDLE, final: state.final ?? [state.committed, state.tentative].filter(Boolean).join(' ').trim(), slow: false }
        notify()
      }
      cleanup()
    },
  }
  return controller
}

/**
 * Zahájí diktování z mikrofonu. Případné běžící diktování ukončí.
 * @param {(state: Object) => void} onState
 * @returns {{ stop: Function, abort: Function, state: Object }}
 */
function startDictation(onState) {
  current?.abort()
  const session = createSession({ onState, withMicrophone: true })
  current = session
  session.start()
  return session
}

/**
 * Zkouška spojení: připojí se, počká na `ready` a hned ukončí (bez mikrofonu).
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
function testConnection() {
  if (current) return Promise.resolve({ ok: false, error: DICTATION_ERROR.BUSY })
  return new Promise((resolve) => {
    let settled = false
    const session = createSession({
      withMicrophone: false,
      onState(state) {
        if (settled) return
        if (state.status === DICTATION_STATUS.LISTENING) {
          settled = true
          resolve({ ok: true })
          session.stop()
          // Server odpoví `done` a zavře spojení; kdyby ne, ukonči sezení sám
          setTimeout(() => session.abort(), 3000)
        } else if (state.status === DICTATION_STATUS.ERROR) {
          settled = true
          resolve({ ok: false, error: state.error })
        } else if (state.status === DICTATION_STATUS.IDLE && state.startedAt) {
          settled = true
          resolve({ ok: false, error: DICTATION_ERROR.CONNECTION_LOST })
        }
      },
    })
    current = session
    session.start()
  })
}

export default {
  id: 'recognita',
  name: 'Recognita (diktování)',

  install(ctx) {
    // Nastavení mohlo dorazit až s obnovou localStorage z Tauri při startu
    reloadRecognitaSettings()
    ctx.registerCapability('dictation:start', startDictation)
    ctx.registerCapability('dictation:test', testConnection)
  },

  uninstall() {
    current?.abort()
    current = null
  },
}
