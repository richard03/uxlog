/**
 * Generování PDF exportu pro sekci Konkurence.
 * Používá jsPDF – čistá funkce bez side effects (kromě stažení souboru).
 */

import { jsPDF } from 'jspdf'
import { isTauri, saveAndOpenFile } from './tauriBridge.js'
import { loadRobotoFonts, registerFonts } from './pdfFonts.js'

const PAGE_WIDTH = 210
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 25
const MARGIN_BOTTOM = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const LINE_HEIGHT = 6

/**
 * Zkontroluje, zda je dost místa na stránce, případně přidá novou.
 * @param {jsPDF} doc
 * @param {number} y - aktuální pozice Y
 * @param {number} needed - kolik místa potřebujeme
 * @returns {number} nová pozice Y
 */
function ensureSpace(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - MARGIN_BOTTOM) {
    doc.addPage()
    return MARGIN_TOP
  }
  return y
}

/**
 * Vykreslí zalamovaný text a vrátí novou pozici Y.
 * @param {jsPDF} doc
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @returns {number}
 */
function drawWrappedText(doc, text, x, y, maxWidth) {
  if (!text) return y
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = ensureSpace(doc, y, LINE_HEIGHT)
    doc.text(line, x, y)
    y += LINE_HEIGHT
  }
  return y
}

/**
 * Vykreslí nadepsanou sekci (label + obsah).
 * @param {jsPDF} doc
 * @param {string} label
 * @param {string} value
 * @param {number} y
 * @returns {number}
 */
function drawLabeledSection(doc, label, value, y) {
  if (!value?.trim()) return y
  y = ensureSpace(doc, y, LINE_HEIGHT * 2)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.text(label, MARGIN_LEFT, y)
  y += LINE_HEIGHT
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9.5)
  y = drawWrappedText(doc, value.trim(), MARGIN_LEFT, y, CONTENT_WIDTH)
  y += 2
  return y
}

/**
 * Vygeneruje PDF s přehledem konkurence a stáhne ho.
 * @param {Object} options
 * @param {Array} options.competitions - pole entit Competition
 * @param {string} options.projectName - název projektu
 * @param {Object} options.labels - i18n popisky { title, description, strengths, weaknesses, inspiration }
 */
export async function exportCompetitionPdf({ competitions, projectName, labels }) {
  const fonts = await loadRobotoFonts()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  registerFonts(doc, fonts)

  // --- Titulní stránka ---
  let y = 60
  doc.setFontSize(22)
  doc.setFont('Roboto', 'bold')
  const titleLines = doc.splitTextToSize(labels.title, CONTENT_WIDTH)
  for (const line of titleLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10
  }

  y += 5
  doc.setFontSize(14)
  doc.setFont('Roboto', 'normal')
  const nameLines = doc.splitTextToSize(projectName, CONTENT_WIDTH)
  for (const line of nameLines) {
    doc.text(line, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 8
  }

  y += 10
  doc.setFontSize(10)
  doc.setTextColor(120)
  const dateStr = new Date().toLocaleDateString('cs-CZ')
  doc.text(dateStr, PAGE_WIDTH / 2, y, { align: 'center' })
  doc.setTextColor(0)

  if (competitions.length === 0) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('Roboto', 'normal')
    doc.text(labels.noData, MARGIN_LEFT, MARGIN_TOP)
    await triggerDownload(doc, projectName)
    return
  }

  // --- Stránky s konkurenty ---
  for (let i = 0; i < competitions.length; i++) {
    const c = competitions[i]
    doc.addPage()
    y = MARGIN_TOP

    // Název konkurenta
    doc.setFontSize(16)
    doc.setFont('Roboto', 'bold')
    doc.setTextColor(40, 80, 160)
    const competitorNameLines = doc.splitTextToSize(c.name || `#${i + 1}`, CONTENT_WIDTH)
    for (const line of competitorNameLines) {
      doc.text(line, MARGIN_LEFT, y)
      y += 8
    }
    doc.setTextColor(0)

    // URL
    if (c.url?.trim()) {
      doc.setFontSize(9)
      doc.setFont('Roboto', 'normal')
      doc.setTextColor(80, 80, 200)
      doc.text(c.url.trim(), MARGIN_LEFT, y)
      doc.setTextColor(0)
      y += LINE_HEIGHT + 2
    }

    // Oddělovací čára
    y += 2
    doc.setDrawColor(200)
    doc.setLineWidth(0.3)
    doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y)
    y += 6

    // Sekce
    y = drawLabeledSection(doc, labels.description, c.description, y)
    y = drawLabeledSection(doc, labels.strengths, c.strengths, y)
    y = drawLabeledSection(doc, labels.weaknesses, c.weaknesses, y)
    y = drawLabeledSection(doc, labels.inspiration, c.inspiration, y)
  }

  await triggerDownload(doc, projectName)
}

/**
 * Spustí stažení/otevření PDF.
 * V Tauri uloží do Dokumenty/UXLog a otevře v systémovém prohlížeči PDF.
 * Ve webovém prostředí spustí klasické stažení.
 * @param {jsPDF} doc
 * @param {string} projectName
 */
async function triggerDownload(doc, projectName) {
  const safeName = projectName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'konkurence'
  const filename = `${safeName}-konkurence.pdf`
  if (isTauri) {
    const arrayBuffer = doc.output('arraybuffer')
    await saveAndOpenFile(filename, arrayBuffer, 'application/pdf')
  } else {
    doc.save(filename)
  }
}
