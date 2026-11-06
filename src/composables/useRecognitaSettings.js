/**
 * Nastavení konektoru Recognita (diktování) pro obrazovku Konektory.
 */

import { ref, computed } from 'vue'
import { callCapability, hasCapability } from '../lib/plugins/registry.js'
import { recognitaSettings, saveRecognitaSettings, isRecognitaConfigured } from '../lib/plugins/recognita/settings.js'
import { isTauri } from '../lib/tauriBridge.js'
import { useI18n } from './useI18n.js'

export function useRecognitaSettings() {
  const { t } = useI18n()
  const settings = computed(() => recognitaSettings.value)
  const configured = computed(() => isRecognitaConfigured(settings.value))
  const maskedKey = computed(() => {
    const v = settings.value.apiKey
    if (!v) return ''
    return v.slice(0, 4) + '●'.repeat(Math.min(Math.max(v.length - 4, 0), 8))
  })

  /** Výsledek zkoušky spojení: null | { ok: boolean, text: string }. */
  const testResult = ref(null)
  const testing = ref(false)

  function saveField(field, value) {
    saveRecognitaSettings({ [field]: value })
    testResult.value = null
  }

  function toggleEnabled() {
    saveRecognitaSettings({ enabled: !settings.value.enabled })
  }

  async function testConnection() {
    if (testing.value || !hasCapability('dictation:test')) return
    testing.value = true
    testResult.value = null
    try {
      const result = await callCapability('dictation:test')
      testResult.value = result?.ok
        ? { ok: true, text: t.settings.recognita.testOk }
        : { ok: false, text: t.settings.recognita.testFailed(t.dictation.errors[result?.error] || t.dictation.errors.server) }
    } finally {
      testing.value = false
    }
  }

  return {
    settings, configured, maskedKey, desktop: isTauri,
    testResult, testing, saveField, toggleEnabled, testConnection,
  }
}
