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

## Testy

```bash
npm test
```

## Architektura

- **Vue 3** + **Vite**
- **localStorage** pro persistenci
- Obchodní logika v `src/lib/` (storage, models, search, store)
- Překlady v `src/i18n/cs.js`
