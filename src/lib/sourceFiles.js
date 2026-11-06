/**
 * Zdroje projektu – rozpoznání formátu nahraného souboru, rozbor e-mailu (.eml) a úprava textu.
 * Samotné čtení souborů (Word, PDF) dělá composable useAddSource přes knihovny mammoth a pdf.js.
 * Čisté funkce.
 */

/** Podporované formáty souborů podle přípony. */
export const SOURCE_FORMATS = Object.freeze({
  docx: ['docx'],
  pdf: ['pdf'],
  text: ['txt', 'md', 'markdown'],
  eml: ['eml'],
})

/** Přípony pro atribut accept u výběru souboru. */
export const SOURCE_ACCEPT = Object.values(SOURCE_FORMATS).flat().map((ext) => `.${ext}`).join(',')

/** Největší velikost nahrávaného souboru (bajty). */
export const SOURCE_MAX_FILE_BYTES = 25 * 1024 * 1024

/**
 * Formát souboru podle přípony.
 * @param {string} fileName
 * @returns {'docx'|'pdf'|'text'|'eml'|null}
 */
export function detectSourceFormat(fileName) {
  const ext = String(fileName ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (!ext) return null
  for (const [format, exts] of Object.entries(SOURCE_FORMATS)) {
    if (exts.includes(ext)) return format
  }
  return null
}

/**
 * Výchozí typ zdroje podle formátu souboru.
 * @param {string|null} format
 * @returns {'document'|'email'|'other'}
 */
export function defaultSourceKind(format) {
  if (format === 'eml') return 'email'
  if (format === 'docx' || format === 'pdf' || format === 'text') return 'document'
  return 'other'
}

/**
 * Název zdroje z názvu souboru (bez přípony, podtržítka a pomlčky jako mezery).
 * @param {string} fileName
 * @returns {string}
 */
export function nameFromFileName(fileName) {
  return String(fileName ?? '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Název vloženého textu: první neprázdný řádek, nejvýše 80 znaků.
 * @param {string} text
 * @returns {string}
 */
export function nameFromText(text) {
  const line = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) || ''
  return line.length > 80 ? `${line.slice(0, 77).trimEnd()}…` : line
}

/**
 * Sjednotí vytažený text: konce řádků, mezery na koncích řádků, nejvýše jeden prázdný řádek za sebou.
 * @param {string} text
 * @returns {string}
 */
export function normalizeSourceText(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// E-mail (.eml, RFC 822 / MIME)
// ---------------------------------------------------------------------------

/** Bajty → text v daném kódování (neznámé kódování = UTF-8). */
function decodeBytes(bytes, charset) {
  try {
    return new TextDecoder(charset || 'utf-8').decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

function base64ToBytes(b64) {
  const clean = String(b64 ?? '').replace(/[^A-Za-z0-9+/=]/g, '')
  try {
    const bin = atob(clean)
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

function quotedPrintableToBytes(text, { header = false } = {}) {
  const src = String(text ?? '').replace(/=\r?\n/g, '')
  const out = []
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
      out.push(parseInt(src.slice(i + 1, i + 3), 16))
      i += 2
    } else if (header && ch === '_') {
      out.push(0x20)
    } else {
      for (const b of new TextEncoder().encode(ch)) out.push(b)
    }
  }
  return new Uint8Array(out)
}

/**
 * Dekóduje hlavičku s kódovanými slovy RFC 2047 (=?utf-8?B?…?= / =?utf-8?Q?…?=).
 * @param {string} value
 * @returns {string}
 */
export function decodeHeaderValue(value) {
  return String(value ?? '')
    .replace(/\?=\s+=\?/g, '?==?')
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, data) => {
      const bytes = enc.toUpperCase() === 'B' ? base64ToBytes(data) : quotedPrintableToBytes(data, { header: true })
      return decodeBytes(bytes, charset)
    })
    .trim()
}

/** Rozdělí zprávu na hlavičky (malá písmena) a tělo; pokračovací řádky hlaviček spojí. */
function splitHeaders(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n')
  const sep = text.indexOf('\n\n')
  const head = sep >= 0 ? text.slice(0, sep) : text
  const body = sep >= 0 ? text.slice(sep + 2) : ''
  const headers = {}
  for (const line of head.replace(/\n[ \t]+/g, ' ').split('\n')) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i).trim().toLowerCase()
    if (!(key in headers)) headers[key] = line.slice(i + 1).trim()
  }
  return { headers, body }
}

/** Parametr hlavičky (např. boundary, charset). */
function headerParam(value, name) {
  const m = String(value ?? '').match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, 'i'))
  return m ? (m[2] ?? m[1]) : ''
}

/** Text z HTML (bez značek, se zachovanými odstavci). */
function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Dekóduje tělo jedné části podle Content-Transfer-Encoding a charsetu. */
function decodePart(headers, body) {
  const encoding = String(headers['content-transfer-encoding'] || '').toLowerCase()
  const charset = headerParam(headers['content-type'], 'charset') || 'utf-8'
  if (encoding === 'base64') return decodeBytes(base64ToBytes(body), charset)
  if (encoding === 'quoted-printable') return decodeBytes(quotedPrintableToBytes(body), charset)
  return body
}

/** Najde textové tělo (text/plain, jinak text/html) v MIME části, rekurzivně přes multipart. */
function findTextBody(headers, body, depth = 0) {
  const type = String(headers['content-type'] || 'text/plain').toLowerCase()
  if (type.startsWith('multipart/') && depth < 5) {
    const boundary = headerParam(headers['content-type'], 'boundary')
    if (!boundary) return null
    const parts = body.split(`--${boundary}`).slice(1).filter((p) => !p.startsWith('--'))
    let html = null
    for (const part of parts) {
      const parsed = splitHeaders(part.replace(/^\n/, ''))
      const found = findTextBody(parsed.headers, parsed.body, depth + 1)
      if (found?.type === 'plain') return found
      if (found && !html) html = found
    }
    return html
  }
  if (/attachment/i.test(headers['content-disposition'] || '')) return null
  if (type.startsWith('text/plain')) return { type: 'plain', text: decodePart(headers, body) }
  if (type.startsWith('text/html')) return { type: 'html', text: htmlToText(decodePart(headers, body)) }
  return null
}

/**
 * Rozebere e-mail ve formátu .eml.
 * @param {string} raw - obsah souboru
 * @returns {{ subject: string, from: string, to: string, date: string, body: string }}
 */
export function parseEml(raw) {
  const { headers, body } = splitHeaders(raw)
  const text = findTextBody(headers, body)
  return {
    subject: decodeHeaderValue(headers.subject),
    from: decodeHeaderValue(headers.from),
    to: decodeHeaderValue(headers.to),
    date: String(headers.date ?? '').trim(),
    body: normalizeSourceText(text?.text ?? ''),
  }
}

/**
 * Text zdroje z rozebraného e-mailu: hlavička (předmět, od, komu, datum) a tělo zprávy.
 * @param {{ subject: string, from: string, to: string, date: string, body: string }} mail
 * @param {{ subject: string, from: string, to: string, date: string }} labels - popisky hlavičky (i18n)
 * @returns {string}
 */
export function emlToSourceText(mail, labels) {
  const head = [
    [labels.subject, mail.subject], [labels.from, mail.from], [labels.to, mail.to], [labels.date, mail.date],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
  return [head.join('\n'), mail.body].filter(Boolean).join('\n\n')
}
