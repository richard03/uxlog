/**
 * Diktování do textového pole (konektor Recognita).
 *
 * Text se vkládá na místo kurzoru (výběr nahradí) a během diktování se živě přepisuje
 * – potvrzená část + předběžný konec. Pole je mezitím jen pro čtení. Po chybě nebo výpadku
 * zůstane dosud nadiktovaný text v poli a nabídne se „Zkusit znovu“ (pokračuje za ním).
 */

import { ref, computed, onBeforeUnmount } from 'vue'
import { hasCapability, callCapability } from '../lib/plugins/registry.js'
import { recognitaSettings, isRecognitaConfigured } from '../lib/plugins/recognita/settings.js'
import { isTauri } from '../lib/tauriBridge.js'
import { liveSpokenText, composeDictatedText, DICTATION_STATUS } from '../lib/dictation.js'
import { useI18n } from './useI18n.js'

const ACTIVE = new Set([DICTATION_STATUS.CONNECTING, DICTATION_STATUS.LISTENING, DICTATION_STATUS.FINISHING])

/**
 * @param {{ getValue: () => string, setValue: (text: string) => void, getElement?: () => HTMLTextAreaElement|HTMLInputElement|null }} target
 */
export function useDictation({ getValue, setValue, getElement = () => null }) {
  const { t } = useI18n()
  const state = ref(null)
  let controller = null
  let anchor = null // { before, after } – text kolem místa vložení

  /** Tlačítko diktování se ukáže jen s aktivním pluginem a vyplněným nastavením. */
  const available = computed(() => isTauri && hasCapability('dictation:start') && isRecognitaConfigured(recognitaSettings.value))

  const status = computed(() => state.value?.status || DICTATION_STATUS.IDLE)
  const active = computed(() => ACTIVE.has(status.value))

  /** Stavová zpráva pod polem (null = nic). */
  const message = computed(() => {
    const s = state.value
    if (!s) return null
    if (s.status === DICTATION_STATUS.ERROR) {
      const text = t.dictation.errors[s.error] || t.dictation.errors.server
      const kept = s.final ? ` ${t.dictation.textKept}` : ''
      return { kind: 'error', text: text + kept }
    }
    if (s.status === DICTATION_STATUS.CONNECTING) return { kind: 'info', text: t.dictation.connecting }
    if (s.status === DICTATION_STATUS.LISTENING) return { kind: s.slow ? 'warning' : 'live', text: s.slow ? t.dictation.slow : t.dictation.listening }
    if (s.status === DICTATION_STATUS.FINISHING) return { kind: s.slow ? 'warning' : 'info', text: s.slow ? t.dictation.slowFinishing : t.dictation.finishing }
    if (s.incomplete && s.final) return { kind: 'warning', text: t.dictation.incomplete }
    return null
  })

  function captureAnchor() {
    const value = getValue() || ''
    const el = getElement()
    let start = value.length
    let end = value.length
    if (el && typeof el.selectionStart === 'number' && document.activeElement === el) {
      start = Math.min(el.selectionStart, value.length)
      end = Math.min(el.selectionEnd ?? start, value.length)
    }
    anchor = { before: value.slice(0, start), after: value.slice(end) }
  }

  function render(s) {
    if (!anchor) return null
    const spoken = s.final ?? liveSpokenText(s.committed, s.tentative)
    const { text, caret } = composeDictatedText({ before: anchor.before, after: anchor.after, spoken })
    if (text !== (getValue() || '')) setValue(text)
    return caret
  }

  function placeCaret(caret) {
    const el = getElement()
    if (!el || caret == null) return
    requestAnimationFrame(() => {
      try {
        el.focus()
        el.setSelectionRange(caret, caret)
      } catch { /* prvek už není v DOM */ }
    })
  }

  function onState(s) {
    state.value = s
    const caret = render(s)
    if (!ACTIVE.has(s.status)) {
      controller = null
      anchor = null
      placeCaret(caret)
    }
  }

  function start() {
    if (active.value || !available.value) return
    captureAnchor()
    controller = callCapability('dictation:start', onState) || null
    if (!controller) anchor = null
  }

  function stop() {
    controller?.stop()
  }

  function toggle() {
    if (active.value) stop()
    else start()
  }

  function dismiss() {
    if (!active.value) state.value = null
  }

  // Odchod z obrazovky / zavření editace: ukonči spojení, text v poli zůstane
  onBeforeUnmount(() => {
    controller?.abort()
    controller = null
  })

  return { available, status, active, message, start, stop, toggle, dismiss }
}
