/**
 * Společné odesílání požadavků na AI služby (OpenAI, Gemini).
 *
 * Každý požadavek má časový limit (`ai.requestTimeoutMs` v data/app.yaml) a jde zrušit
 * (`cancelAiRequests` – zruší všechny právě běžící požadavky na AI). Chyba nese kód
 * (`AI_TIMEOUT`, `AI_CANCELLED`) a srozumitelnou zprávu pro uživatele.
 */

import { ref } from 'vue'
import { APP_CONFIG } from '../../dataConfig.js'
import cs from '../../../i18n/cs.js'

/** Kódy chyb požadavku na AI. */
export const AI_ERROR = Object.freeze({ TIMEOUT: 'AI_TIMEOUT', CANCELLED: 'AI_CANCELLED' })

/** Počet právě běžících požadavků na AI (pro UI). */
export const aiRequestsRunning = ref(0)

let cancelController = new AbortController()

/**
 * Chyba požadavku s kódem.
 * @param {string} code
 * @returns {Error & { code: string }}
 */
export function aiError(code) {
  const message = code === AI_ERROR.TIMEOUT
    ? cs.ai.timeout(Math.round(APP_CONFIG.ai.requestTimeoutMs / 1000))
    : cs.ai.cancelled
  return Object.assign(new Error(message), { code })
}

/**
 * Je chyba zrušení požadavku uživatelem?
 * @param {unknown} err
 * @returns {boolean}
 */
export function isAiCancelled(err) {
  return err?.code === AI_ERROR.CANCELLED
}

/**
 * Je chyba vypršení časového limitu?
 * @param {unknown} err
 * @returns {boolean}
 */
export function isAiTimeout(err) {
  return err?.code === AI_ERROR.TIMEOUT
}

/**
 * fetch s časovým limitem a možností zrušení.
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<Response>}
 */
export async function aiFetch(url, init = {}, { timeoutMs = APP_CONFIG.ai.requestTimeoutMs, fetchImpl = fetch } = {}) {
  const cancelSignal = cancelController.signal
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  aiRequestsRunning.value++
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.any([cancelSignal, timeoutSignal]) })
  } catch (err) {
    if (cancelSignal.aborted) throw aiError(AI_ERROR.CANCELLED)
    if (timeoutSignal.aborted) throw aiError(AI_ERROR.TIMEOUT)
    throw err
  } finally {
    aiRequestsRunning.value--
  }
}

/** Zruší všechny právě běžící požadavky na AI (další požadavky už poběží normálně). */
export function cancelAiRequests() {
  cancelController.abort()
  cancelController = new AbortController()
}
