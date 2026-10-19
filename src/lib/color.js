/**
 * Barvy – čisté funkce (kontrast textu na barevném pozadí podle WCAG).
 */

/** Tmavé a světlé písmo, ze kterých se vybírá čitelnější. */
export const DARK_TEXT = '#1a1d23'
export const LIGHT_TEXT = '#ffffff'

/**
 * Normalizuje hex barvu na tvar #rrggbb (malými písmeny); neplatná hodnota → null.
 * Podporuje #rgb a #rrggbb (průhlednost se nepodporuje).
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeHexColor(value) {
  if (typeof value !== 'string') return null
  const s = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(s)) return s
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
  return null
}

/**
 * Hex barva → složky RGB (0–255); neplatná hodnota → null.
 * @param {unknown} value
 * @returns {{ r: number, g: number, b: number }|null}
 */
export function parseHexColor(value) {
  const hex = normalizeHexColor(value)
  if (!hex) return null
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

/**
 * Relativní jas barvy podle WCAG 2.x (0 = černá, 1 = bílá); neplatná barva → null.
 * @param {unknown} value
 * @returns {number|null}
 */
export function relativeLuminance(value) {
  const rgb = parseHexColor(value)
  if (!rgb) return null
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/**
 * Kontrastní poměr dvou barev podle WCAG (1–21); neplatná barva → null.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number|null}
 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  if (la == null || lb == null) return null
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Barva písma, která je na daném pozadí čitelnější (tmavá, nebo bílá); neplatné pozadí → null.
 * @param {unknown} background
 * @returns {string|null}
 */
export function readableTextColor(background) {
  if (!normalizeHexColor(background)) return null
  return contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT
}

/**
 * Barevné schéma kartičky s vlastní barvou pozadí: písmo, tlumené písmo a okraj odvozené z pozadí.
 * Neplatná nebo chybějící barva → null (kartička má barvy motivu).
 * @param {unknown} background
 * @returns {{ background: string, text: string, muted: string, border: string }|null}
 */
export function cardColorScheme(background) {
  const bg = normalizeHexColor(background)
  if (!bg) return null
  const text = readableTextColor(bg)
  const dark = text === DARK_TEXT
  return {
    background: bg,
    text,
    // Tlumený text a okraj = průhledná varianta písma, takže drží kontrast na jakémkoli pozadí
    muted: dark ? 'rgba(26, 29, 35, 0.72)' : 'rgba(255, 255, 255, 0.8)',
    border: dark ? 'rgba(26, 29, 35, 0.18)' : 'rgba(255, 255, 255, 0.24)',
  }
}
