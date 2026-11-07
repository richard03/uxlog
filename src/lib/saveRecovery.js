/**
 * Nouzová záloha neuložených změn.
 *
 * Když zápis do databáze (SQLite) selže, poslední hodnota klíče se dočasně uloží do localStorage
 * pod klíčem s prefixem `uxlog-unsaved:` a zápis se opakuje. Po úspěšném zápisu se záloha smaže;
 * zůstane-li (aplikace se mezitím zavřela), při dalším startu se z ní data obnoví.
 * Prefix záměrně nezačíná `uxlog_` – jednorázová migrace starých klíčů z localStorage by zálohu smazala.
 *
 * Čisté funkce bez side effects.
 */

/** Prefix klíče zálohy v localStorage. */
export const BACKUP_PREFIX = 'uxlog-unsaved:'

/** Prodlevy opakovaných pokusů o zápis (poslední se pak opakuje). */
export const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000]

/**
 * Klíč zálohy v localStorage pro uložený klíč.
 * @param {string} key
 * @returns {string}
 */
export function backupKeyFor(key) {
  return BACKUP_PREFIX + key
}

/**
 * Uložený klíč ze zálohy (klíč localStorage bez prefixu zálohy = null).
 * @param {unknown} storageKey
 * @returns {string|null}
 */
export function keyFromBackup(storageKey) {
  if (typeof storageKey !== 'string' || !storageKey.startsWith(BACKUP_PREFIX)) return null
  const key = storageKey.slice(BACKUP_PREFIX.length)
  return key.startsWith('uxlog_') ? key : null
}

/**
 * Prodleva před dalším pokusem o zápis.
 * @param {number} attempt - pořadí pokusu od 0
 * @returns {number} ms
 */
export function retryDelay(attempt) {
  const i = Number.isInteger(attempt) && attempt > 0 ? attempt : 0
  return RETRY_DELAYS_MS[Math.min(i, RETRY_DELAYS_MS.length - 1)]
}

/**
 * Souhrn problému s ukládáním pro UI.
 * @param {Iterable<[string, { error?: string, backedUp?: boolean }]>} failed - klíč → stav
 * @returns {{ keys: string[], backedUp: boolean, error: string }|null} null = vše uloženo
 */
export function summarizeSaveProblem(failed) {
  const entries = [...(failed ?? [])].filter(([key]) => typeof key === 'string')
  if (!entries.length) return null
  return {
    keys: entries.map(([key]) => key),
    backedUp: entries.every(([, s]) => s?.backedUp === true),
    error: String(entries[entries.length - 1][1]?.error ?? ''),
  }
}
