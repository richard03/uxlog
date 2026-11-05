/**
 * Vault – nastavení zápisu do složky (uloženo v localStorage pod `uxlog_vault`, zrcadleno do Tauri).
 * Nastavení je jen tohoto počítače (cesty se mezi počítači liší), proto není v datech projektu.
 * Čisté funkce.
 */

export const VAULT_SETTINGS_KEY = 'uxlog_vault'

/**
 * Výchozí nastavení: vypnuto, výchozí složka nezvolená (doplní se výchozí z Tauri), žádné projekty
 * s vlastním nastavením. Změny ze složky se načítají vždy.
 * projects: id projektu → { root } (vlastní složka) nebo { off: true } (projekt se nezapisuje);
 * projekt bez záznamu patří do výchozí složky.
 */
export const DEFAULT_VAULT_SETTINGS = Object.freeze({ enabled: false, root: '', projects: Object.freeze({}) })

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Normalizuje nastavení složky jednoho projektu.
 * @param {unknown} raw
 * @returns {{ root: string }|{ off: true }|null} null = výchozí složka
 */
export function normalizeProjectVaultSetting(raw) {
  if (!isObject(raw)) return null
  if (raw.off === true) return { off: true }
  const root = typeof raw.root === 'string' ? raw.root.trim() : ''
  return root ? { root } : null
}

/**
 * Normalizuje uložené nastavení (tolerantní k poškozeným datům).
 * @param {unknown} raw
 * @returns {{ enabled: boolean, root: string, projects: Object.<string, { root: string }|{ off: true }> }}
 */
export function normalizeVaultSettings(raw) {
  const data = isObject(raw) ? raw : {}
  const projects = {}
  if (isObject(data.projects)) {
    for (const [id, value] of Object.entries(data.projects)) {
      const setting = normalizeProjectVaultSetting(value)
      if (id && setting) projects[id] = setting
    }
  }
  return {
    enabled: data.enabled === true,
    root: typeof data.root === 'string' ? data.root.trim() : '',
    projects,
  }
}

/**
 * Přečte nastavení z JSON řetězce.
 * @param {unknown} text
 * @returns {{ enabled: boolean, root: string, projects: Object }}
 */
export function parseVaultSettings(text) {
  try {
    return normalizeVaultSettings(JSON.parse(String(text ?? '')))
  } catch {
    return normalizeVaultSettings(null)
  }
}

/**
 * Nastavení s upravenou složkou jednoho projektu.
 * @param {Object} settings
 * @param {string} projectId
 * @param {{ root: string }|{ off: true }|null} value - null = výchozí složka
 * @returns {Object} nové nastavení (vstup se nemění)
 */
export function withProjectVaultSetting(settings, projectId, value) {
  const next = normalizeVaultSettings(settings)
  const setting = normalizeProjectVaultSetting(value)
  if (setting) next.projects[projectId] = setting
  else delete next.projects[projectId]
  return next
}
