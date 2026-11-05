/**
 * Pořadí projektů v přehledu.
 *
 * Projekty, které uživatel ještě nepřesunul (bez `sortOrder`, nebo s výchozí hodnotou 9999 z továrny
 * projektu – data/entities.yaml), jsou na začátku od nejnovějšího
 * (createdAt sestupně) – nově založený projekt se tak objeví jako první. Za nimi následují projekty
 * v pořadí, které uživatel nastavil přetažením (`sortOrder` vzestupně).
 * Čisté funkce.
 */

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
/** Výchozí sortOrder nového projektu (data/entities.yaml) = pořadí zatím nenastavené. */
export const UNSET_SORT_ORDER = 9999
const hasOrder = (p) => typeof p.sortOrder === 'number' && Number.isFinite(p.sortOrder) && p.sortOrder < UNSET_SORT_ORDER

/** Novější projekt dřív (createdAt sestupně, při shodě podle id kvůli stabilitě). */
function byNewest(a, b) {
  const ca = String(a.createdAt ?? '')
  const cb = String(b.createdAt ?? '')
  if (ca !== cb) return ca < cb ? 1 : -1
  return String(a.id ?? '') < String(b.id ?? '') ? -1 : 1
}

/**
 * Seřadí projekty pro přehled.
 * @param {Array<Object>} projects
 * @returns {Array<Object>} nové pole (vstup se nemění)
 */
export function sortProjectsForList(projects) {
  const list = (Array.isArray(projects) ? projects : []).filter(isObject)
  const unordered = list.filter((p) => !hasOrder(p)).sort(byNewest)
  const ordered = list.filter(hasOrder).sort((a, b) => (a.sortOrder - b.sortOrder) || byNewest(a, b))
  return [...unordered, ...ordered]
}
