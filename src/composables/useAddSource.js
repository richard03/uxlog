/**
 * Přidání zdroje projektu: nahrání souboru (Word, PDF, text, e-mail) nebo vložení textu.
 * Čtení souborů běží v prohlížeči/WebView – knihovny mammoth (Word) a pdf.js (PDF) se načtou
 * až při prvním použití. Rozpoznání formátu a rozbor e-mailu jsou v lib/sourceFiles.js.
 */

import { reactive } from 'vue'
import {
  detectSourceFormat, defaultSourceKind, nameFromFileName, nameFromText, normalizeSourceText,
  parseEml, emlToSourceText, SOURCE_ACCEPT, SOURCE_MAX_FILE_BYTES,
} from '../lib/sourceFiles.js'
import { useStore } from './useStore.js'
import { useEntityHelpers } from './useEntityHelpers.js'
import { useI18n } from './useI18n.js'

/** Text z dokumentu Word (.docx). */
async function readDocx(file) {
  const { default: mammoth } = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result?.value ?? ''
}

/** Text z PDF (po stránkách; naskenované PDF bez textové vrstvy vrátí prázdný text). */
async function readPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    pages.push(content.items.map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ''}`).join(''))
  }
  await doc.destroy()
  return pages.join('\n\n')
}

export function useAddSource(getProjectId) {
  const store = useStore()
  const { t } = useI18n()
  const { generateNextCode, getCodePrefix } = useEntityHelpers()

  /** Rozpracovaný zdroj v dialogu. */
  const draft = reactive({ name: '', kind: 'document', content: '', fileName: '', reading: false, error: '' })

  function reset() {
    Object.assign(draft, { name: '', kind: 'document', content: '', fileName: '', reading: false, error: '' })
  }

  /**
   * Načte soubor do rozpracovaného zdroje (název, typ a text z obsahu souboru).
   * @param {File} file
   */
  async function readFile(file) {
    draft.error = ''
    if (!file) return
    const format = detectSourceFormat(file.name)
    if (!format) {
      draft.error = t.sources.unsupportedFile(file.name)
      return
    }
    if (file.size > SOURCE_MAX_FILE_BYTES) {
      draft.error = t.sources.fileTooLarge(Math.round(SOURCE_MAX_FILE_BYTES / 1024 / 1024))
      return
    }
    draft.reading = true
    try {
      let text = ''
      let mailSubject = ''
      if (format === 'docx') text = await readDocx(file)
      else if (format === 'pdf') text = await readPdf(file)
      else if (format === 'eml') {
        const mail = parseEml(await file.text())
        mailSubject = mail.subject
        text = emlToSourceText(mail, t.sources.mailHeader)
      } else text = await file.text()
      text = normalizeSourceText(text)
      if (!text) {
        draft.error = format === 'pdf' ? t.sources.pdfNoText : t.sources.emptyFile
        return
      }
      Object.assign(draft, {
        content: text,
        fileName: file.name,
        kind: defaultSourceKind(format),
        name: mailSubject || nameFromFileName(file.name),
      })
    } catch (err) {
      draft.error = t.sources.readFailed(err?.message ?? String(err))
    } finally {
      draft.reading = false
    }
  }

  /**
   * Uloží zdroj. Bez názvu použije první řádek textu.
   * @returns {Object|null} nový zdroj
   */
  function save() {
    const content = normalizeSourceText(draft.content)
    if (!content) {
      draft.error = t.sources.contentRequired
      return null
    }
    const pid = getProjectId()
    const name = draft.name.trim() || nameFromText(content) || t.source.label
    return store.addSource(pid, {
      code: generateNextCode(getCodePrefix('source'), store.getSources(pid)),
      name,
      kind: draft.kind,
      content,
      fileName: draft.fileName,
    })
  }

  return { draft, reset, readFile, save, accept: SOURCE_ACCEPT }
}
