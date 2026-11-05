---
name: uxlog-review
description: Revize dat projektu UXLog – kontrola úplnosti záznamů, chybějících vazeb (persona bez scénáře, scénář bez požadavků, požadavek bez zdroje), rozporů, duplicit a technických chyb v souborech; výstupem je zpráva s doporučeními, data se nemění. Použij, když uživatel chce zkontrolovat, zhodnotit nebo uklidit projekt (např. „co v projektu chybí“, „zkontroluj persony a scénáře“, „připrav přehled mezer před předáním“).
---

# Revize projektu UXLog

Revize data **nemění**. Výstupem je zpráva. Opravy proveď, jen když o ně uživatel potom požádá (skilly uxlog-data a uxlog-edit-entity).

## Postup

1. **Technická kontrola:** `node .uxlog/bin/uxlog.mjs validate --json` a vyber problémy daného projektu.
2. **Přehled:** `INDEX.md` ve složce projektu a `node .uxlog/bin/uxlog.mjs list --project "<projekt>"` (ve vlastní složce projektu bez `--project`).
3. **Úplnost:** u každého typu zjisti příkazem `node .uxlog/bin/uxlog.mjs schema <typ>` pole, která mají být vyplněná (řádek „Úplnost záznamu“), a najdi záznamy, kterým chybí.
4. **Vazby a pokrytí:**
   - persony bez scénářů (`scenarioIds`), scénáře bez person a bez požadavků,
   - požadavky, na které neodkazuje žádný scénář, persona, hypotéza ani stakeholder,
   - hypotézy bez navazujících požadavků a hypotézy, které zůstávají `untested`, přestože projekt pokročil,
   - rizika bez opatření (`mitigation`), cíle bez metrik.
5. **Obsah:** duplicitní nebo velmi podobné záznamy, rozpory mezi záznamy, příliš obecné formulace a tvrzení bez zdroje.
6. **Zpráva:** seřaď nálezy podle závažnosti. U každého uveď kód záznamu, problém a konkrétní doporučení. Na konci nabídni, které opravy můžeš udělat.

## Zásady

- Hodnoť podle dat ve složce, ne podle domněnek. U obsahových nálezů rozlišuj jistotu („chybí pole“) a názor („formulace je vágní“).
- Varování o odkazech na neexistující záznamy jsou často pozůstatky starších dat. Uveď je souhrnně a nepovažuj je za hlavní nález.
