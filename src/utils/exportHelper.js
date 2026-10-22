import { saveAndOpenFile } from '../lib/tauriBridge.js'

/**
 * Stáhne text jako soubor.
 * V Tauri uloží do Dokumenty/UXLog a ukáže soubor ve složce, ve webu stáhne klasicky.
 * @param {string} text
 * @param {string} filename - název bez přípony, bude sanitizován
 * @param {{ extension?: string, mimeType?: string }} [options]
 * @returns {Promise<string|null>} cesta k uloženému souboru (Tauri), ve webu null; při chybě výjimka
 */
export function downloadText(text, filename, { extension = 'txt', mimeType = 'text/plain' } = {}) {
  const safe = filename.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'export'
  const fullName = `${safe}.${extension}`
  const bytes = new TextEncoder().encode(text)
  return saveAndOpenFile(fullName, bytes, `${mimeType};charset=utf-8`, { reveal: true })
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
 * @returns {Promise<string|null>}
 */
export function downloadYaml(yaml, filename) {
  return downloadText(yaml, filename, { extension: 'yaml', mimeType: 'application/yaml' })
}

/**
 * Zkopíruje YAML do schránky.
 * @param {string} yaml
 * @returns {Promise<boolean>} true pokud se povedlo
 */
export function copyYaml(yaml) {
  return copyText(yaml)
}
