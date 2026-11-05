---
name: uxlog-data
description: Bezpečná práce s daty aplikace UXLog ve složce dat – čtení, vyhledání, zakládání, úpravy, propojování a mazání záznamů projektu (persony, scénáře, požadavky, hypotézy, cíle, stakeholdeři, konkurence, rizika, aktivity, tým, úkoly, chyby) tak, aby je aplikace UXLog dokázala načíst. Použij vždy, když úkol sahá do souborů dat UXLog (složka projects/ nebo vlastní složka projektu s project.md) nebo se týká záznamů UX projektu, i když slovo UXLog nezazní (např. „přidej personu“, „propoj scénář s požadavkem“, „co víme o cílech projektu“).
---

# Práce s daty UXLog

Pravidla formátu jsou v `.uxlog/claude/RULES.md`. Tento postup popisuje, jak s daty pracovat, aby se nerozbila.

## Postup

1. **Zorientuj se.** Rejstřík projektu je v `INDEX.md` ve složce projektu (kód, název, soubor, id). Přehled vypíše i `node .uxlog/bin/uxlog.mjs list [typ] --project "<projekt>"` (ve vlastní složce projektu bez `--project`). Pro vyhledávání v textech použij grep nad soubory záznamů.
2. **Zjisti tvar dat.** Než upravíš typ záznamu, se kterým jsi ještě nepracoval, spusť `node .uxlog/bin/uxlog.mjs schema <typ>`. Ukáže sekce, pole frontmatteru, povolené hodnoty a vazby.
3. **Proveď změnu nejbezpečnější cestou:**
   - nový záznam: `node .uxlog/bin/uxlog.mjs new <typ> --project "<projekt>" --name "<název>" [--set pole=hodnota]`, potom doplň text sekcí v souboru, který příkaz vypíše,
   - vazba: `node .uxlog/bin/uxlog.mjs link <záznam> <pole> <cíl…>` (záznam i cíl můžeš zadat kódem, id nebo cestou), odebrání vazby `unlink`,
   - text nebo hodnota: uprav soubor přímo, frontmatter i sekce,
   - smazání: `node .uxlog/bin/uxlog.mjs delete <záznam>`, jen když o to uživatel výslovně požádal,
   - nový projekt: `node .uxlog/bin/uxlog.mjs new project --name "<název>"`.
4. **Zkontroluj výsledek** příkazem `node .uxlog/bin/uxlog.mjs validate` a oprav všechny chyby. Pokud hook po úpravě souboru nahlásí chybu, oprav ji hned.
5. **Shrň uživateli**, které soubory jsi vytvořil, změnil nebo smazal. Změny se do aplikace načtou samy a uživatel je může vrátit v Historii projektu.

## Na co dát pozor

- Neměň `id`, `code`, `createdAt` ani `updatedAt`. Nepřidávej `projectId`, protože projekt určuje složka.
- Hodnoty výběru (stav, priorita, typ…) musí být jedna z povolených, jinak je aplikace nenačte. Ověříš je příkazem `schema`.
- Do polí `*Ids` patří jen id ze stejného projektu, ne kódy. Příkaz `link` převede kód na id sám.
- V textu sekcí nepoužívej nadpisy `#` a `##`, pro členění použij `###`.
- Když si nejsi jistý, který záznam uživatel myslí (stejné jméno ve více projektech), zeptej se ho.
- Nesahej do `.uxlog/`, `INDEX.md` ani do souborů nastavení spravovaných aplikací.
