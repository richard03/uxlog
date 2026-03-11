/**
 * Paleta barev pro projekty a logika přiřazování unikátních barev.
 */

export const PROJECT_COLORS = [
  '#e05252', // červená
  '#e07c4a', // oranžová
  '#e0b84a', // jantarová
  '#6abd6a', // zelená
  '#4aaa8a', // tyrkysová
  '#4a90d9', // modrá
  '#6e7fdd', // indigo
  '#9c6dd0', // fialová
  '#d06db0', // růžová
  '#8d6e63', // hnědá
  '#78909c', // šedě-modrá
  '#26c6da', // cyan
]

/**
 * Vybere výchozí barvu pro nový projekt, která ještě není použita.
 * Pokud jsou všechny barvy obsazeny, vybere tu nejméně používanou.
 * @param {string[]} usedColors - Pole barev aktuálně používaných v projektech
 * @returns {string}
 */
export function pickProjectColor(usedColors = []) {
  const unused = PROJECT_COLORS.find((c) => !usedColors.includes(c))
  if (unused) return unused

  // Všechny barvy obsazeny – vybrat nejméně používanou
  const counts = Object.fromEntries(PROJECT_COLORS.map((c) => [c, 0]))
  for (const c of usedColors) {
    if (counts[c] !== undefined) counts[c]++
  }
  return PROJECT_COLORS.reduce((min, c) => (counts[c] < counts[min] ? c : min), PROJECT_COLORS[0])
}
