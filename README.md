# UXLog

Desktopová aplikace pro logování UX design procesu a spolupráci s Figmou. Funguje offline bez připojení k internetu; pluginy mohou přidat napojení na LLM služby, Flexi API nebo Figmu.

## Funkce

- **Projekty** - název, rozsah (malý/střední/velký), priorita, fáze (Research/Design/Development), termín, poznámkový blok
- **Cíle a metriky** - kód, název, popis, metriky
- **Stakeholdeři** - jméno, popis, úroveň vlivu a zájmu (Mendelowova matice)
- **Konkurence** - silné/slabé stránky, inspirace
- **Hypotézy** - stav (netestováno/testováno/vyvráceno), vysvětlení
- **Persony** - protopersona/persona, motivace, potřeby, problémy, velikost a hodnota cílové skupiny
- **Požadavky** - MoSCoW, motivace, konflikty
- **Scénáře** - frekvence, hodnota, MoSCoW
- **Aktivity** - šablony úkolů s checklisty a termíny
- **Úkoly** - SMART cíle s termíny a přiřazením
- **Bugy** - závažnost, dopad, priorita
- **Tým** - členové týmu s rolemi

Další:
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

### Ikony

Po výměně zdrojového obrázku (čtvercový PNG, ideálně ≥512px):

```bash
npx tauri icon src-tauri/icons/app-icon.png
```

## Architektura

- **Vue 3** + **Vite** + **Tauri 2** (Rust)
- **Web:** `localStorage`; **desktop (Tauri):** embedded `SQLite` přes nativní storage bridge
- Obchodní logika v `src/lib/` (čisté, testovatelné funkce)
- Stav v `src/lib/stores/` (reaktivní store moduly)
- Plugin systém v `src/lib/plugins/` (event bus, capabilities)
- Překlady v `src/i18n/cs.js`
- Vlastní CSS design systém v `src/style.css` (CSS proměnné, bez externí knihovny)
