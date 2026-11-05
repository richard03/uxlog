# Pravidla pro práci s daty UXLog

<!-- Tento soubor generuje aplikace UXLog (šablona data/vault/RULES.md) a při každém zápisu ho přepíše. Neupravujte ho. -->

Tato složka obsahuje data aplikace UXLog pro záznam UX design procesu. Každý záznam (persona, scénář, požadavek…) je jeden soubor Markdown. Aplikace soubory zapisuje sama. Změny provedené v souborech aplikace načte sama, jakmile je uložíš (jdou vrátit v Historii projektu). Když stejné pole mezitím změnil i uživatel v aplikaci, aplikace se ho zeptá, která verze platí.

## Struktura

{{STRUCTURE}}

## Formát záznamu

```markdown
---
id: 3f2c…                 # identita záznamu – nikdy neměň
code: PER-001             # kód – neměň, nový přidělí příkaz new
status: persona           # povolené hodnoty: příkaz schema
scenarioIds:              # vazby = id záznamů ze stejného projektu
  - 9a1b…  # SCN-002 Objednání termínu   ← komentář doplňuje aplikace
---
# Název záznamu

## Popis

Text v Markdownu…

## Motivace

…
```

- Strukturovaná pole (výběry, čísla, vazby `*Ids`, časy) jsou ve frontmatteru. Textová pole jsou sekce `## Popisek pole`. Seznam polí, povolené hodnoty, sekce a vazby vypíše příkaz `node .uxlog/bin/uxlog.mjs schema <typ>`.
- V textu sekce nepoužívej nadpisy `#` a `##`, protože by sekci rozdělily. Pro členění použij `###` a nižší.
- Sekci s neznámým nadpisem aplikace zachová, ale nezobrazí. Obsah proto patří do existujících polí.
- Časová razítka (`createdAt`, `updatedAt`) nastavuje aplikace, neměň je.

## Pravidla

1. Identitu záznamu nese `id`, nikoli název souboru. Neměň `id` ani `code`. Soubor nekopíruj se stejným `id`.
2. Nový záznam zakládej příkazem `new`, který přidělí id i kód. Ruční vytvoření souboru bez id funguje, ale aplikace pak id a kód doplní až při načtení.
3. Vazby měň příkazy `link` a `unlink`, nebo úpravou polí `*Ids`. Do nich patří jen id existujících záznamů ze stejného projektu, odpovídajícího typu.
4. Záznam mažeš příkazem `delete`, který odstraní i odkazy na něj. Smazání se do aplikace načte samo.
5. Neupravuj `.uxlog/`, `INDEX.md`, `.claude/settings.json` ani `.claude/skills/uxlog-*`.
6. Po úpravách spusť `node .uxlog/bin/uxlog.mjs validate` a oprav všechny chyby. Hook navíc kontroluje každý upravený soubor automaticky. Varování o odkazech na neexistující záznamy pocházejí většinou ze starších dat a neblokují.
7. Soubor můžeš přejmenovat, aplikace název sjednotí.
8. Měň jen to, o co uživatel požádal. Každá změna se hned načte do aplikace a uživatel ji může vrátit v Historii projektu.
9. Nevymýšlej fakta. Citace, čísla a zjištění z výzkumu přebírej jen ze zdrojů, které uživatel dodal, a uveď, odkud jsou.
10. Na konci shrň, které soubory jsi změnil.

## Příkazy

```
{{CLI_HELP}}
```
