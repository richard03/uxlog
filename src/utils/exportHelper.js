/**
 * Pomocná funkce pro export dat – zkusí clipboard, jinak stáhne soubor.
 * @param {string} yaml
 * @param {string} filename - název bez přípony, bude sanitizován
 */
export async function downloadOrCopyYaml(yaml, filename) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(yaml)
      return
    } catch {}
  }
  const safe = filename.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'export'
  const blob = new Blob([yaml], { type: 'application/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safe + '.yaml'
  a.click()
  URL.revokeObjectURL(url)
}
