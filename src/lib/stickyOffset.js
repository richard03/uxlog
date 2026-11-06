/**
 * Odsazení `top` pro přichycený (position: sticky) sloupec, který může být vyšší než okno.
 *
 * Krátký sloupec zůstane přichycený u horního okraje (`topGap`). Vysoký sloupec dostane záporné
 * odsazení: nejdřív se s obsahem doroluje, až je vidět jeho spodek (nad `bottomGap`),
 * a teprve pak zůstane stát – žádná jeho část tak není nedosažitelná.
 *
 * @param {{ viewportHeight: number, elementHeight: number, topGap?: number, bottomGap?: number }} sizes
 * @returns {number} hodnota `top` v px
 */
export function stickyTopOffset({ viewportHeight, elementHeight, topGap = 0, bottomGap = 0 } = {}) {
  const top = Number.isFinite(topGap) ? topGap : 0
  const bottom = Number.isFinite(bottomGap) ? bottomGap : 0
  if (!Number.isFinite(viewportHeight) || !Number.isFinite(elementHeight) || elementHeight <= 0) return top
  return Math.min(top, viewportHeight - bottom - elementHeight)
}
