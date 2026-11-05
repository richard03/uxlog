---
name: uxlog-research-synthesis
description: Syntéza UX výzkumu do dat UXLog – z přepisů rozhovorů, poznámek z pozorování, dotazníků nebo jiných podkladů navrhne a po odsouhlasení založí či doplní persony, scénáře, hypotézy, požadavky a rizika projektu s odkazem na zdroj. Použij, když uživatel chce zpracovat výzkum, rozhovory nebo poznámky do projektu UXLog (např. „zpracuj rozhovor R4 do person“, „jaké hypotézy plynou z těchto poznámek“, „doplň scénáře podle přepisů“).
---

# Syntéza výzkumu do UXLog

## Postup

1. **Podklady.** Ujasni si, které soubory jsou zdrojem (přepisy, poznámky) a do kterého projektu patří. Podklady čti, neupravuj je.
2. **Současný stav.** Projdi `INDEX.md` ve složce projektu a relevantní záznamy, aby ses vyhnul duplicitám. U každého zjištění rozhodni, jestli doplňuje existující záznam, nebo je nové.
3. **Návrh.** Uživateli nejdřív předlož přehled, ještě nic nezakládej:
   - nové záznamy (typ, navržený název, 1–2 věty obsahu, zdroj),
   - doplnění existujících záznamů (kód, co přibude, zdroj),
   - navržené vazby (např. persona ↔ scénář, scénář → požadavek, hypotéza → požadavek).
   Rozlišuj fakta z podkladů od svých interpretací a interpretace označ.
4. **Po odsouhlasení** zakládej záznamy příkazem `node .uxlog/bin/uxlog.mjs new …`, doplň text sekcí a vazby nastav příkazem `link`. Existující záznamy doplňuj podle skillu uxlog-edit-entity.
5. **Zdroje.** Citace a zjištění zapisuj do textu odpovídajících polí s označením zdroje, například `> „Nemám čas hledat.“ – R3`. Jména respondentů nahraď označením (R1, R2…), pokud uživatel nechce jinak.
6. Spusť `node .uxlog/bin/uxlog.mjs validate` a oprav chyby.
7. Shrň, co jsi založil a doplnil, a připomeň načtení změn v aplikaci.

## Zásady

- Nevymýšlej citace, čísla ani chování, které v podkladech není.
- Persona bez opory ve výzkumu má stav `protopersona`. Stav `persona` jí dej, jen když ji podklady dostatečně podporují.
- Hypotézu formuluj tak, aby šla ověřit. Ověřená ani vyvrácená není, dokud to podklady neprokážou (stav `untested`).
- Raději méně kvalitních záznamů než mnoho podobných. Podobná zjištění slučuj.
