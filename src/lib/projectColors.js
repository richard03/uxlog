/**
 * Paleta barev pro projekty a logika přiřazování unikátních barev.
 */

import { APP_CONFIG } from './dataConfig.js'

/** Paleta z data/app.yaml (projectColors). */
export const PROJECT_COLORS = APP_CONFIG.projectColors

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
