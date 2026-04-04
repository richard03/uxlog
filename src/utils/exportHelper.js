import { isTauri, saveAndOpenFile } from '../lib/tauriBridge.js'

/**
 * Stáhne YAML jako soubor.
 * V Tauri uloží do Dokumenty/UXLog a otevře, ve webu stáhne klasicky.
 * @param {string} yaml
 * @param {string} filename - název bez přípony, bude sanitizován
 */
export function downloadYaml(yaml, filename) {
  const safe = filename.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'export'
  const fullName = safe + '.yaml'
  if (isTauri) {
    const bytes = new TextEncoder().encode(yaml)
    saveAndOpenFile(fullName, bytes, 'application/yaml')
  } else {
    const blob = new Blob([yaml], { type: 'application/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fullName
    a.click()
    URL.revokeObjectURL(url)
  }
}

/**
 * Zkopíruje YAML do schránky.
 * @param {string} yaml
 * @returns {Promise<boolean>} true pokud se povedlo
 */
export async function copyYaml(yaml) {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(yaml)
    return true
  } catch {
    return false
  }
}
