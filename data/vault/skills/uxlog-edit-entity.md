---
name: uxlog-edit-entity
description: Úprava obsahu záznamu UXLog (persony, scénáře, požadavku, hypotézy, rizika, cíle…) – doplnění, zpřesnění, přeformulování nebo sloučení textů v jeho sekcích tak, aby zůstal původní obsah, styl i struktura souboru. Použij, když uživatel chce upravit, doplnit, zkrátit, sjednotit nebo vylepšit text existujícího záznamu ve složce dat UXLog (např. „doplň motivaci persony Anna“, „přepiš popis SCN-003 srozumitelněji“, „sluč tyhle dva požadavky“).
---

# Úprava záznamu UXLog

## Postup

1. Najdi soubor záznamu (`INDEX.md`, `node .uxlog/bin/uxlog.mjs list`) a přečti ho celý, včetně frontmatteru a neznámých sekcí.
2. Ověř, které sekce a pole typ má: `node .uxlog/bin/uxlog.mjs schema <typ>`. Text patří do odpovídající sekce, například motivace do `## Motivace`, ne do `## Popis`.
3. Uprav jen to, o co uživatel požádal:
   - zachovej text, který měnit nemáš, i jeho jazyk, tón a formát (odrážky, odstavce),
   - přidávej k existujícímu textu, nepřepisuj ho, pokud uživatel nechce přepis,
   - nové informace ber jen z podkladů, které uživatel dodal, a u citací uveď zdroj (např. „– R3“),
   - nemaž obsah, který vypadá jako ruční poznámka uživatele, ani když se ti nehodí.
4. Hodnoty výběru (stav, priorita…) měň jen na povolené hodnoty (`schema`). Vazby měň příkazem `link`/`unlink`.
5. **Sloučení dvou záznamů:** obsah přenes do jednoho záznamu a vazby, které vedly na druhý, přepoj příkazem `link`. Druhý záznam smaž příkazem `delete` až po výslovném souhlasu uživatele.
6. Spusť `node .uxlog/bin/uxlog.mjs validate`.
7. Ukaž uživateli stručně, co jsi změnil (před a po u hlavních změn), a připomeň načtení změn v aplikaci.

## Pozor

- Nadpis `# …` je název záznamu. Změnu názvu udělej jen na žádost uživatele.
- V textu sekcí nepoužívej nadpisy `#` a `##`, pro členění použij `###`.
- Neměň `id`, `code`, časová razítka ani soubory v `.uxlog/`.
