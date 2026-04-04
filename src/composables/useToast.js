/**
 * Minimalistický toast systém – sdílený reaktivní stav.
 * Zobrazí krátkou zprávu, která po chvíli zmizí.
 */
import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let hideTimer = null

/**
 * Zobrazí toast s danou zprávou.
 * @param {string} text
 * @param {number} [duration=3000] - doba zobrazení v ms
 */
export function showToast(text, duration = 3000) {
  clearTimeout(hideTimer)
  message.value = text
  visible.value = true
  hideTimer = setTimeout(() => {
    visible.value = false
  }, duration)
}

/**
 * Composable pro přístup k toast stavu (pro komponentu).
 */
export function useToast() {
  return { message, visible, showToast }
}
