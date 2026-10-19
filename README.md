# UXLog

Desktopová aplikace pro logování UX design procesu a spolupráci s Figmou. Funguje offline bez připojení k internetu; pluginy mohou přidat napojení na LLM služby, Flexi API nebo Figmu.

## Funkce

- **Projekty** - název, rozsah (malý/střední/velký), priorita, fáze (Research/Design/Development), termín, poznámkový blok
- **Cíle a metriky** - kód, název, popis, metriky
- **Stakeholdeři** - jméno, popis, úroveň vlivu a zájmu (Mendelowova matice)
- **Konkurence** - silné/slabé stránky, inspirace
- **Hypotézy** - stav (netestováno/testováno/vyvráceno), vysvětlení
- **Persony** - protopersona/persona, motivace, potřeby, problémy, velikost a hodnota cílové skupiny
- **Požadavky** - MoSCoW, kategorie (datový/funkční/kvalitativní/omezení), motivace, konflikty
- **Scénáře** - spouštěč, uspokojení potřeby, frekvence, hodnota, MoSCoW
- **Rizika** - pravděpodobnost, dopad, opatření, stav
- **Aktivity** - katalog 31 UX technik s checklisty, termíny a metodikou „Jak na to“; doporučení dalších aktivit podle stavu projektu
- **Úkoly** - SMART cíle s termíny a přiřazením
- **Bugy** - závažnost, dopad, priorita
- **Tým** - členové týmu s rolemi

Další:
- **Data / Canvas** – přepínač pohledu projektu vedle loga; Canvas je nekonečné plátno přes celé okno: entity jako kartičky, výběr myší (i obdélníkem), přetahování jednotlivých kartiček i skupin, posun a zoom plátna, dvojklik otevře detail entity v plovoucím okně nad plátnem (každá entita ve vlastním okně, okna jde přesouvat a měnit jim velikost); nad výběrem plovoucí lišta s barvou kartiček a menu „…“ (přesun, kopie, smazání); filtr typů na horní hraně zvýrazní kartičky jednoho typu
- Vazby mezi entitami (many-to-many) s automatickým propojováním
- Fulltextové vyhledávání napříč všemi entitami
- Export/import dat v JSON a YAML s řešením konfliktů
- Vlastní atributy entit (konfigurovatelné)
- Šablony aktivit s checklisty
- Skóre kompletnosti projektu
- Drag & drop řazení
- Tmavý/světlý režim
- Přístupnost (ARIA, skip link, klávesová navigace, čtečky)

## Pluginy

- **data-status** - sledování času poslední synchronizace
- **tauri-local-api** - HTTP API server na localhost:8000 (komunikace s Figma pluginem)
- **flexi** - volitelná synchronizace s Flexi API
- **openai** - integrace ChatGPT (poznámkový blok, návrhy vazeb)
- **gemini** - Google Gemini AI (stejné funkce jako OpenAI)

## Figma integrace

Figma plugin (`figma-plugin/`) komunikuje s UXLog přes lokální HTTP API server (Tauri). Designer vybere prvky ve Figmě a plugin je pošle do UXLog.

## Vývoj

```bash
npm install
npm run dev          # Vite dev server (:5173)
npm test             # Vitest - jednorázový běh
npm run test:watch   # Vitest - watch mód
```

## Build

```bash
npm run build        # web build do dist/
```

## Desktop (Tauri)

Vyžaduje [Rust](https://rustup.rs) a na Windows runtime **WebView2**.

```bash
npm run tauri:dev    # vývojové okno + Vite
npm run tauri:build  # instalátor v src-tauri/target/release/bundle/
```

Oba příkazy nejdřív spustí `scripts/check-build-cache.js`: pokud byl projekt přesunut do jiné složky, smaže zastaralou Rust cache (`src-tauri/target`), která obsahuje absolutní cesty. První build po přesunu je proto delší.

### Ikony

Po výměně zdrojového obrázku (čtvercový PNG, ideálně ≥512px):

```bash
npx tauri icon src-tauri/icons/app-icon.png
```

## Konfigurace (`/data`)

Konfigurovatelná data jsou v YAML souborech ve složce `data/` (komentáře `#` jsou povolené). Přibalí se při buildu a načtou při startu (`src/lib/dataConfig.js`); chybný soubor nezastaví aplikaci – neplatné položky se vynechají s varováním v konzoli.

- `data/activity-types.yaml` – katalog typů aktivit: skupiny, názvy, popisy, délky, checklisty a metodika „Jak na to“. Id položek checklistu neměňte (odkazují na ně uložené aktivity).
- `data/entities.yaml` – datová struktura entit (persony, scénáře, požadavky, rizika, …): prefix kódu, výchozí hodnoty nové entity, atributy formuláře/detailu (typy polí, volby selectů, pořadí) a pole pro skóre úplnosti. Popisky jsou klíče do `src/i18n/cs.js`.
- `data/app.yaml` – paleta barev projektů, výchozí délky projektů podle rozsahu, práh pro doporučení aktivit.

Uživatel může šablony aktivit a atributy entit dál upravovat v aplikaci (Konfigurace); soubory v `data/` určují výchozí stav.

## Architektura

- **Vue 3** + **Vite** + **Tauri 2** (Rust)
- **Web:** `localStorage`; **desktop (Tauri):** embedded `SQLite` přes nativní storage bridge
- **Historie změn projektu:** samostatný klíč `uxlog_history` (zápis v `persist()` → `stores/history.js`, logika rozdílů a vracení v `lib/history.js`)
- **Canvas:** rozvržení kartiček v `project.canvas` (logika `lib/canvas.js`, store `stores/canvas.js`, UI `useProjectCanvas` + `CanvasView.vue`); okna detailů nad plátnem: logika `lib/canvasWindows.js`, stav a tažení `useCanvasWindows`, okno `CanvasEntityWindow.vue` (stejná komponenta detailu jako v Datech, navigaci podle kontextu řeší `useEntityNavigation`)
- Obchodní logika v `src/lib/` (čisté, testovatelné funkce)
- Stav v `src/lib/stores/` (reaktivní store moduly)
- Plugin systém v `src/lib/plugins/` (event bus, capabilities)
- Překlady v `src/i18n/cs.js`
- Katalog aktivit a jejich metodika v `data/activity-types.yaml` (převyprávěno z interní knihovny technik; složka `knowledge/` s exportem knihovny je jen lokální podklad, je v `.gitignore` a aplikace ji nenačítá)
- Vlastní CSS design systém v `src/style.css` (CSS proměnné, bez externí knihovny)
