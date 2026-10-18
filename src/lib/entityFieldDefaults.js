/**
 * Výchozí definice atributů pro všechny typy entit.
 * Obsahuje pouze "body" atributy – název a kód entity se konfigurovat nedají
 * a zůstávají vždy v hlavičce detailu.
 *
 * Každý atribut má:
 *   key        – klíč ve datovém objektu entity
 *   labelKey   – cesta k překladu (tPath) pro výchozí popisek
 *   type       – typ vstupu: text | textarea | url | select | email | tel | number-unit
 *   sortOrder  – výchozí pořadí zobrazení
 *   searchable – true pokud se má pole zahrnout do fulltextového vyhledávání
 *   options?   – pro select: pole { value, labelKey }
 *   valueKey?  – pro number-unit: klíč hodnoty v entitě
 *   unitKey?   – pro number-unit: klíč jednotky v entitě
 *   units?     – pro number-unit: pole { value, labelKey }
 *   visibleWhen? – podmíněná viditelnost: { field, value }
 *
 * Definice jsou v data/entities.yaml (entities.<typ>.fields).
 */

import { ENTITY_CONFIG } from './dataConfig.js'

export const ENTITY_FIELD_DEFAULTS = Object.fromEntries(
  Object.entries(ENTITY_CONFIG)
    .filter(([, e]) => e.fields)
    .map(([type, e]) => [type, e.fields]),
)

/**
 * Seznam entit, které v hlavičce zobrazují kód (vedle názvu).
 * @type {Set<string>}
 */
export const ENTITIES_WITH_CODE = new Set(
  Object.entries(ENTITY_CONFIG).filter(([, e]) => e.codePrefix).map(([type]) => type),
)
