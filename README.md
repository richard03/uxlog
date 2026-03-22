# UXLog

Webová aplikace pro logování UX design procesu. Umožňuje spravovat projekty a jejich cíle, stakeholdery, konkurenci, hypotézy, persony, požadavky a scénáře.

## Funkce

- **Projekty** – název, rozsah, priorita, fáze, datum poslední práce
- **Cíle a metriky** – kód, název, popis, metriky
- **Stakeholdeři** – jméno, popis, úroveň vlivu a zájmu
- **Konkurence** – silné/slabé stránky, inspirace
- **Hypotézy** – stav (netestováno/testováno/vyvráceno)
- **Persony** – protopersona/persona, motivace, potřeby, problémy
- **Požadavky** – MoSCoW, motivace, konflikty
- **Scénáře** – frekvence, hodnota, MoSCoW

- Fulltextové vyhledávání
- Export dat do JSON
- Tmavý režim
- Přístupnost (skip link, ARIA, klávesové zkratky)
- Lokální úložiště (localStorage)

## Vývoj

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Výstup je v `dist/`. Nasazení na PHP server: nahrajte obsah `dist/` do kořene webu.

## Desktop (Tauri)

Vyžaduje [Rust](https://rustup.rs) a na Windows runtime **WebView2**.

```bash
npm run tauri:dev    # vývojové okno + Vite
npm run tauri:build  # instalátor v src-tauri/target/release/bundle/
```

### Ikony

Build na Windows potřebuje `src-tauri/icons/icon.ico` a další soubory z `bundle.icon` v `tauri.conf.json`. Po výměně zdrojového obrázku (čtvercový PNG, ideálně ≥512×512) spusťte z kořene repa:

```bash
npx tauri icon src-tauri/icons/app-icon.png
```

Nebo vygenerujte výchozí `app-icon.png` skriptem `src-tauri/icons/generate-app-icon.ps1` a pak znovu `npx tauri icon …`.

## Testy

```bash
npm test
```

## Architektura

- **Vue 3** + **Vite**
- **localStorage** pro persistenci
- Obchodní logika v `src/lib/` (storage, models, search, store)
- Překlady v `src/i18n/cs.js`
