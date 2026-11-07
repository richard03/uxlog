/**
 * Správa API klíčů lokálního HTTP API (Figma plugin) na obrazovce Konektory.
 * Vytvořený klíč se vrátí jen jednou (`createdToken`); uloží se jen jeho SHA-256 otisk,
 * který při každém požadavku ověřuje Rust server (`http_api.rs`).
 */

import { ref, onMounted, onUnmounted } from 'vue'
import {
  LOCAL_API_KEYS_KEY, TOKEN_BYTES, parseLocalApiKeys, serializeLocalApiKeys, buildApiToken,
  tokenDisplayPrefix, normalizeKeyName, addLocalApiKey, removeLocalApiKey,
} from '../lib/localApiKeys.js'
import { generateId } from '../lib/id.js'
import { isTauri, readStoredValue, writeStoredValue, localApiKeyUsage } from '../lib/tauriBridge.js'
import { copyText } from '../utils/exportHelper.js'
import { useI18n } from './useI18n.js'

/** Jak často obnovit „naposledy použito“, dokud je karta otevřená. */
const USAGE_REFRESH_MS = 10_000

/** Adresa API pro nastavení Figma pluginu. */
const API_URL = 'http://127.0.0.1:17842'

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function useLocalApiKeys() {
  const { t } = useI18n()
  const keys = ref(parseLocalApiKeys(readStoredValue(LOCAL_API_KEYS_KEY)))
  /** id klíče → ms epoch posledního použití (od startu aplikace). */
  const usage = ref({})
  /** Právě vytvořený klíč: { id, name, token } – ukáže se jen jednou. */
  const createdToken = ref(null)
  const copied = ref(false)
  const error = ref('')
  const busy = ref(false)

  async function save(next) {
    await writeStoredValue(LOCAL_API_KEYS_KEY, serializeLocalApiKeys(next))
    keys.value = next
  }

  /**
   * Vytvoří nový klíč a uloží jeho otisk.
   * @param {string} name
   */
  async function createKey(name) {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      const token = buildApiToken(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)))
      const record = {
        id: generateId(),
        name: normalizeKeyName(name, t.settings.localApi.defaultName(keys.value.length + 1)),
        hash: await sha256Hex(token),
        prefix: tokenDisplayPrefix(token),
        createdAt: new Date().toISOString(),
      }
      await save(addLocalApiKey(keys.value, record))
      createdToken.value = { id: record.id, name: record.name, token }
      copied.value = false
    } catch (err) {
      console.error('[LocalApi] vytvoření klíče selhalo:', err)
      error.value = t.settings.localApi.saveFailed
    } finally {
      busy.value = false
    }
  }

  /**
   * Odvolá klíč – Figma plugin s ním hned přestane mít přístup.
   * @param {string} id
   */
  async function revokeKey(id) {
    error.value = ''
    try {
      await save(removeLocalApiKey(keys.value, id))
      if (createdToken.value?.id === id) createdToken.value = null
    } catch (err) {
      console.error('[LocalApi] odvolání klíče selhalo:', err)
      error.value = t.settings.localApi.saveFailed
    }
  }

  async function copyCreated() {
    if (!createdToken.value) return
    copied.value = await copyText(createdToken.value.token)
  }

  function dismissCreated() {
    createdToken.value = null
    copied.value = false
  }

  async function refreshUsage() {
    try {
      usage.value = await localApiKeyUsage()
    } catch (err) {
      console.error('[LocalApi] načtení použití klíčů selhalo:', err)
    }
  }

  let timer = null
  onMounted(() => {
    if (!isTauri) return
    refreshUsage()
    timer = setInterval(refreshUsage, USAGE_REFRESH_MS)
  })
  onUnmounted(() => clearInterval(timer))

  return {
    desktop: isTauri,
    apiUrl: API_URL,
    keys, usage, createdToken, copied, error, busy,
    createKey, revokeKey, copyCreated, dismissCreated,
  }
}
