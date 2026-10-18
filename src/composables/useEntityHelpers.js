/**
 * Composable pro pure utility funkce nad entitami.
 * Zabaluje lib/ funkce pro použití ve views.
 */

import { generateNextCode } from '../lib/code.js'
import { getEntityCompleteness } from '../lib/completeness.js'
import { getBugPriority, getStakeholderStrategy } from '../lib/models.js'
import { generateId } from '../lib/id.js'
import { getCodePrefix } from '../lib/dataConfig.js'

export function useEntityHelpers() {
  return {
    generateNextCode,
    getEntityCompleteness,
    getBugPriority,
    getStakeholderStrategy,
    generateId,
    /** Prefix kódu entity z data/entities.yaml (např. getCodePrefix('persona') → 'PER'). */
    getCodePrefix,
  }
}
