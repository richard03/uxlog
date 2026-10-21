import { isTauri, saveAndOpenFile } from '../lib/tauriBridge.js'

/**
 * Stáhne text jako soubor.
 * V Tauri uloží do Dokumenty/UXLog a otevře, ve webu stáhne klasicky.
 * @param {string} text
 * @param {string} filename - název bez přípony, bude sanitizován
 * @param {{ extension?: string, mimeType?: string }} [options]
 */
export function downloadText(text, filename, { extension = 'txt', mimeType = 'text/plain' } = {}) {
  const safe = filename.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'export'
  const fullName = `${safe}.${extension}`
  if (isTauri) {
    const bytes = new TextEncoder().encode(text)
    saveAndOpenFile(fullName, bytes, mimeType)
  } else {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fullName
    a.click()
    URL.revokeObjectURL(url)
  }
}

/**
 * Zkopíruje text do schránky.
 * @param {string} text
 * @returns {Promise<boolean>} true pokud se povedlo
 */
export async function copyText(text) {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Stáhne YAML jako soubor.
 * @param {string} yaml
 * @param {string} filename - název bez přípony, bude sanitizován
 */
export function downloadYaml(yaml, filename) {
  downloadText(yaml, filename, { extension: 'yaml', mimeType: 'application/yaml' })
}

/**
 * Zkopíruje YAML do schránky.
 * @param {string} yaml
 * @returns {Promise<boolean>} true pokud se povedlo
 */
export function copyYaml(yaml) {
  return copyText(yaml)
}
