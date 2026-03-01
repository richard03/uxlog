/**
 * Composable pro správu tmavého režimu.
 * Ukládá preferenci do localStorage a respektuje prefers-color-scheme.
 */

import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY = 'uxlog_theme'

/**
 * Vrací reaktivní stav tématu (dark/light).
 * @returns {Object}
 */
export function useTheme() {
  const isDark = ref(true)

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    isDark.value = dark
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch (_) {}
  }

  function toggle() {
    applyTheme(!isDark.value)
  }

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored ? stored === 'dark' : prefersDark
    applyTheme(dark)
  })

  return { isDark, toggle, applyTheme }
}
