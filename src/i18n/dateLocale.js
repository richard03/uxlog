/**
 * Mapování interního kódu UI jazyka na značku BCP 47 pro Intl (datum/čas).
 * Při přidání dalšího jazyka doplnit záznam a držet v souladu s useI18n(messages).
 */

/** @type {Record<string, string>} */
const BCP47_BY_UI_LOCALE = {
  cs: 'cs-CZ',
}

/**
 * Vrátí značku locale pro formátování datumů podle kódu UI jazyka.
 * @param {string} [uiLocale='cs']
 * @returns {string}
 */
export function dateLocaleBcp47ForUi(uiLocale = 'cs') {
  return BCP47_BY_UI_LOCALE[uiLocale] ?? BCP47_BY_UI_LOCALE.cs
}
