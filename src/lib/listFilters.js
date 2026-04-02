/**
 * Společná logika pro přepínače typu „badge“ v seznamech entit.
 */

/**
 * Filtruje položky podle OR pravidel: nic není zapnuto → vrátí původní seznam;
 * jinak ponechá jen položky, u kterých platí alespoň jedna aktivní větev.
 * @template T
 * @param {T[]|null|undefined} items
 * @param {Array<{ active: boolean, match: (item: T) => boolean }>} branches
 * @returns {T[]}
 */
export function filterByAnyActiveBranch(items, branches) {
  const list = items ?? []
  const active = branches.filter((b) => b.active)
  if (active.length === 0) return list
  return list.filter((item) => active.some((b) => b.match(item)))
}
