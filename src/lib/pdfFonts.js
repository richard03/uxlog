/**
 * Lazy-loading Roboto TTF pro jsPDF.
 * Fonty se načtou jednou a cachují se v paměti.
 *
 * jsPDF vyžaduje TrueType s unicode cmap tabulkou ve formátu 4 (Windows UCS-2).
 * Variabilní Roboto nebo soubory bez této tabulky vedou k chybě „No unicode cmap for font“.
 * Statické TTF z balíčku pdfmake (licence OFL, stejná rodina Roboto) s jsPDF fungují spolehlivě.
 */

import robotoRegularUrl from 'pdfmake/build/fonts/Roboto/Roboto-Regular.ttf?url'
import robotoMediumUrl from 'pdfmake/build/fonts/Roboto/Roboto-Medium.ttf?url'

let fontCache = null

/**
 * Načte Roboto Regular a tučné řez (Roboto Medium 500 jako náhrada za Bold 700 – kompatibilní glyfy).
 * Výsledek se cachuje – opakované volání vrací okamžitě.
 * @returns {Promise<{ regular: string, bold: string }>}
 */
export async function loadRobotoFonts() {
  if (fontCache) return fontCache

  const [regularBuf, boldBuf] = await Promise.all([
    fetch(robotoRegularUrl).then((r) => {
      if (!r.ok) throw new Error(`Roboto-Regular.ttf: HTTP ${r.status}`)
      return r.arrayBuffer()
    }),
    fetch(robotoMediumUrl).then((r) => {
      if (!r.ok) throw new Error(`Roboto-Medium.ttf: HTTP ${r.status}`)
      return r.arrayBuffer()
    }),
  ])

  fontCache = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  }
  return fontCache
}

/**
 * Zaregistruje Roboto fonty do instance jsPDF (VFS + addFont).
 * @param {import('jspdf').jsPDF} doc
 * @param {{ regular: string, bold: string }} fonts – base64 obsahy TTF
 */
export function registerFonts(doc, fonts) {
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
}

/**
 * Převod ArrayBuffer → base64 řetězec pro jsPDF VFS.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
