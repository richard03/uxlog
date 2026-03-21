# Figma Plugin – Flexi Connector Specification

## Účel dokumentu

Tento soubor je implementační specifikace pro rozšíření Figma pluginu o napojení na Flexi API. Každé tvrzení níže spadá do jedné z těchto kategorií:

- **Ověřeno v kódu**: potvrzeno v aktuálním repozitáři (číslo verze aplikace je v `src/lib/version.js`).
- **Rozhodnutí**: závazné řešení pro implementaci.
- **Otevřené riziko**: věc, která musí být vyřešena před nebo během implementace.

## Kontext a cíl

**Ověřeno v kódu:**
- Plugin dnes funguje jako statický YAML import/export nástroj.
- Stávající plugin generuje karty pro entity `persona`, `hypothesis`, `scenario`, `stakeholder`,
  `goal`, `competition` a `requirement`.
- Hlavní aplikace už má implementovanou Flexi API vrstvu v `src/lib/flexiApi.js` a synchronizační
  logiku v `src/lib/flexiSync.js`.

**Rozhodnutí:**
- Ze stávajícího YAML exportu zachovat výstupy - plugin musí i po úpravě generovat vizuálně stejné výstupy do Figmy.
- Umožnit uživateli vložit do Figmy jednotlivé objekty, hromadně vložit jeden typ objektů (např. všechny požadavky), nebo vložit všechny objekty z celého projektu.
- Přidat novou záložku `Nastavení` pro konfiguraci připojení.
- Plugin má být tenký sync klient. Nemá zavádět druhý, s hlavní aplikací nekompatibilní sync model.

**Řešení nemá obsahovat:**
- Vložení objektů z více projektů najednou.
- Vytváření nových entit přímo z Figmy.
- Mazání entit v databázi z Figmy.
- Úpravy layoutu karet na základě změn z API.
- Synchronizace mimo aktuální stránku dokumentu.

---

## Technická omezení Figma pluginů

**Ověřeno v platformě / existujícím pluginu:**
- `code.js` nemůže provádět síťové požadavky.
- HTTP komunikace musí jít přes `ui.html`, komunikace mezi vrstvami přes `postMessage`.
- Persistované nastavení pluginu patří do `figma.clientStorage`.
- Změny v dokumentu lze sledovat přes `figma.on('documentchange', handler)`.
- UI polling lze provozovat v `ui.html`.

**Rozhodnutí:**
- Síťová vrstva bude pouze v `ui.html`.
- Manipulace s Figma uzly bude pouze v `code.js`.
- Každá zpráva mezi `ui.html` a `code.js` musí mít explicitní typ a payload schema.

---

## Bezpečnost a CORS

**Ověřeno:**
- Hlavní pravidla repozitáře povolují CORS pouze pro `https://uxlog.prokoho.cz`.
- Figma plugin `ui.html` neběží pod tímto originem.
- Přímé browserové volání z pluginu na Flexi API proto za současné architektury narazí na CORS.

**Rozhodnutí:**
- Tento dokument **nepovoluje** řešení typu `Access-Control-Allow-Origin: *`.
- Tento dokument **nepovoluje** přidat `null` origin bez explicitního bezpečnostního rozhodnutí
  mimo tento repozitář.
- Neimplementovat "rychlý hack", který by obcházel stávající bezpečnostní pravidla.

**Preferované řešení:**
- Připojení pluginu musí používat architekturu, která zachová bezpečnostní model projektu.
- Prakticky to znamená jednu z těchto variant:
  1. serverová/proxy vrstva dostupná z povoleného originu,
  2. explicitně schválený plugin-safe endpoint s vlastním auth a CORS režimem,
  3. jiné řešení, které formálně nenaruší pravidlo "only `https://uxlog.prokoho.cz`".

**Otevřené riziko:**
- Dokud není vybraná bezpečná síťová architektura, nelze live sync považovat za implementačně
  uzavřený úkol.

---

## Zdroj pravdy pro API a sync

**Rozhodnutí:**
- Referenčním zdrojem pravdy pro API kontrakt je `src/lib/flexiApi.js`.
- Referenčním zdrojem pravdy pro synchronizační semantiku je `src/lib/flexiSync.js`.
- Tento dokument nesmí definovat endpointy nebo pravidla řešení konfliktů tak, aby odporovaly těmto
  souborům.

**Ověřeno v kódu:**
- Hlavní app používá `Authorization: Bearer <apiKey>`.
- Hlavní app používá kolekce `/api/uxlog_{entityType}`.
- Hlavní app pracuje s `_ts`, `_uxlog_id`, checksumy, `since` fetchi a mapováním API ID.

**Rozhodnutí:**
- Plugin má ve výchozím stavu používat stejnou autentizaci jako hlavní app:
  `Authorization: Bearer <apiKey>`.
- Pokud server podporuje více auth režimů, plugin nemá svévolně zavádět jiný standard, dokud k tomu
  není vědomé rozhodnutí.

---

## API kontrakt pro plugin

### Kolekce

**Ověřeno v kódu hlavní app:**

```text
/api/uxlog_projects
/api/uxlog_goals
/api/uxlog_stakeholders
/api/uxlog_competitions
/api/uxlog_hypotheses
/api/uxlog_personas
/api/uxlog_scenarios
/api/uxlog_requirements
/api/uxlog_activities
/api/uxlog_teamMembers
POST /api/uxlog_batch
```

Hlavní aplikace v `src/lib/flexiSync.js` synchronizuje kromě výše uvedeného též kolekce
`tasks`, `bugs`, `connections`. Plugin první verze pro ně negeneruje karty a nemusí je
pollovat; kontrakt v `flexiApi.js` / `flexiSync.js` zůstává referencí pro případné rozšíření.

**Rozhodnutí:**
- Endpoint `uxlog_projects` slouží k načtení seznamu projektů a výběru projektu při importu
  z API; neexistuje k němu typ Figmy karty v tomto pluginu.
- Volitelně lze použít hromadný endpoint `POST /api/uxlog_batch` stejně jako hlavní aplikace
  (`src/lib/flexiApi.js`): při nepodpoře serverem se přepíná na jednotlivé požadavky.
- Plugin první verze pracuje pouze s těmito typy karet:
  `persona`, `requirement`, `scenario`, `stakeholder`, `goal`, `hypothesis`, `competition`.
- Mapování plugin typů na API kolekce musí být explicitní a jednotné:

| Plugin entity type | API kolekce |
|---|---|
| `persona` | `uxlog_personas` |
| `requirement` | `uxlog_requirements` |
| `scenario` | `uxlog_scenarios` |
| `stakeholder` | `uxlog_stakeholders` |
| `goal` | `uxlog_goals` |
| `hypothesis` | `uxlog_hypotheses` |
| `competition` | `uxlog_competitions` |

### Čtení dat

**Ověřeno v kódu hlavní app:**
- Full fetch vrací pole záznamů.
- Inkrementální fetch přes `?since=<timestamp_ms>` může vracet tvar:
  `{ records: [...], deleted: [...] }`.
- Checksum endpoint `GET /api/uxlog_checksum` může vrátit checksum per kolekce.

**Rozhodnutí:**
- Polling bude per kolekce, ne přes jeden globální timestamp pro všechno.
- Pokud je dostupný checksum endpoint, plugin ho použije jako první filtr.
- Pokud checksum endpoint není dostupný, plugin přejde na přímý polling kolekcí.

### Zápis dat

**Ověřeno v kódu hlavní app:**
- Sync logika používá `_ts` a `_uxlog_id`.
- API může vracet ID odlišné od UXLog UUID.

**Rozhodnutí:**
- Plugin nesmí posílat "holý PUT bez metadat", pokud tím poruší sync kontrakt hlavní app.
- Pro každou synchronizovanou kartu musí plugin znát:
  - UXLog ID entity,
  - API ID entity, pokud se liší,
  - timestamp poslední potvrzené synchronizace.

---

## Stav současného pluginu

**Ověřeno v `figma-plugin/code.js`:**
- Generátory `generatePersonaCards()` a `generateGenericCards()` ukládají `uxlogEntityType` a
  `uxlogEntity`.
- Ukládá se `uxlogProject`, pokud je k dispozici projekt.
- Textové uzly jsou dnes identifikovatelné hlavně přes `node.name`.
- `uxlogField` pluginData zatím na textových uzlech není.
- `uxlogEntityId`, `uxlogProjectId`, `uxlogSource` a `uxlogApiId` dnes plugin plošně neukládá.

**Rozhodnutí:**
- Nově generované karty musí dostat kompletní sync metadata.
- Staré karty musí zůstat čitelné přes fallback logiku založenou na `node.name` a `uxlogEntity`.

---

## Datový model pluginData

### Povinné pluginData na kartě

```javascript
card.setPluginData('uxlogEntityType', 'persona')
card.setPluginData('uxlogEntityId', '550e8400-e29b-41d4-a716-446655440000')
card.setPluginData('uxlogProjectId', 'eccd3ac6-...')
card.setPluginData('uxlogSource', 'flexi')
card.setPluginData('uxlogEntity', JSON.stringify(entity))
```

### Volitelné, ale doporučené pluginData na kartě

```javascript
card.setPluginData('uxlogApiId', '12345')
card.setPluginData('uxlogLastSyncTs', '1773968463857')
```

### Povinné pluginData na textových uzlech

```javascript
textNode.setPluginData('uxlogField', fieldName)
```

**Rozhodnutí:**
- `uxlogSource` rozlišuje původ karty (např. `flexi` po importu z API, `yaml` po importu z YAML),
  aby šlo konzistentně řídit ochranu před sync smyčkou a případnou budoucí logiku.
- `uxlogField` je nový primární způsob párování pole entity na textový uzel.
- Extrakce i update musí mít fallback na dnešní pojmenování uzlů, aby se nerozbily staré karty.

---

## Funkce 1 – Konfigurace připojení

**UI záložky `Nastavení`:**
- pole `Flexi API URL`,
- pole `Flexi API key`,
- tlačítko `Připojit`,
- po úspěšném spojení tlačítko `Odpojit`.

**Rozhodnutí:**
- Nastavení se ukládá do `figma.clientStorage` pod jedním klíčem.
- Při startu pluginu se nastavení načte automaticky.
- Selhání obnovy připojení nesmí blokovat použití ostatních záložek pluginu.
- UI musí jasně rozlišit stavy připojení a sjednotit je se stavovým indikátorem (funkce 5), včetně
  rozdílu „nenakonfigurováno“ (chybí URL/klíč) vs. „offline“ (konfigurace je, síť/server neodpovídá).

---

## Funkce 2 – Import entit z API do Figmy

**Tok importu:**
1. `ui.html` načte data z API.
2. `ui.html` filtruje pouze záznamy zvoleného projektu, pokud API neumí server-side filtr.
3. `ui.html` předá normalizovaný payload do `code.js`.
4. `code.js` použije stávající generátory karet.
5. Při generování doplní sync metadata a `uxlogField`.

**Rozhodnutí:**
- Pokud API vrací všechna data pro daný key bez `projectId` filtru, dokument to bere jako
  existující omezení, ne jako ideální stav.
- Pokud se později objeví server-side filtr, plugin má dostat přednostně ten.

**Otevřené riziko:**
- Client-side filtrování všech záznamů projektu je horší pro výkon i soukromí dat. Není to důvod
  blokovat první verzi, ale je to technický dluh.

---

## Funkce 3 – Sync Figma → API

### Detekce změn

**Rozhodnutí:**
- Poslouchat změny textových uzlů uvnitř karet, které mají sync metadata.
- Debounce držet po entitě, ne globálně.
- Neodesílat změny u karet bez `uxlogEntityId`.

### Debouncing

**Rozhodnutí:**
- Výchozí debounce může být 30 sekund.
- Hodnota musí být jedna sdílená konstanta.
- Stav UI musí ukazovat, že změna čeká na synchronizaci.

### Payload pro zápis

**Rozhodnutí:**
- Z karty se extrahují pouze podporovaná pole entity.
- Payload musí respektovat sync semantiku hlavní app, zejména `_ts` a identifikaci entity.
- Pokud API vyžaduje vlastní ID v URL, plugin použije `uxlogApiId`, jinak `uxlogEntityId`.

### Duplicitní karty stejné entity

**Rozhodnutí:**
- Více karet se stejným `uxlogEntityId` reprezentuje jednu entitu.
- Změna textu na jedné kartě vede k jednomu zápisu do API za daný debounce cyklus entity.
- Potvrzený update z API se propíše do všech karet stejné entity na aktuální stránce.

**Otevřené riziko:**
- Pokud uživatel upraví dvě karty se stejným `uxlogEntityId` na různý obsah před synchronizací,
  výsledná hodnota v API závisí na pořadí zápisů; spec nevyžaduje merge. Implementace má buď
  dát přednost poslednímu zápisu, nebo zobrazit konflikt – volba musí být vědomá a konzistentní s hlavní app.

---

## Funkce 4 – Sync API → Figma

### Polling

**Rozhodnutí:**
- Polling běží v `ui.html`.
- Timestamp posledního fetch musí být veden per kolekce, ne globálně.
- Pokud je k dispozici checksum endpoint, polling nejprve porovná checksumy a teprve potom stahuje
  změněné kolekce.

### Aplikace změn do Figmy

**Rozhodnutí:**
- `code.js` hledá pouze karty na `figma.currentPage`.
- Aktualizují se jen hodnoty polí, ne struktura ani layout karty.
- Před zápisem do textového uzlu je nutné načíst font.
- Pokud API vrátí informaci o smazání, plugin první verze kartu nemaže; maximálně může zobrazit
  stav "zdroj již neexistuje".

### Ochrana před sync smyčkou

**Rozhodnutí:**
- Jednoduchý globální boolean `suppressSync` nestačí.
- Implementace musí umět rozlišit:
  - změnu vyvolanou uživatelem,
  - změnu právě aplikovanou z API,
  - změnu potvrzenou po vlastním zápisu.
- Preferovaný přístup je dočasné označení konkrétních uzlů nebo konkrétní entity jako
  "interně aktualizované", ne proces-wide globální přepínač.

---

## Funkce 5 – Stavový indikátor

Plugin má mít kompaktní stavový pruh v záhlaví.

| Stav | Text (výchozí) | Poznámka |
|---|---|---|
| offline | `Nepřipojeno` nebo `Není nastaveno` | Druhý text, pokud chybí konfigurace (není totéž jako „síť nedostupná“). |
| connecting | `Ověřuji připojení…` | |
| idle | `Synchronizováno` | Odpovídá stavu „připojeno“ z konfigurace. |
| reading | `Načítám…` | |
| writing | `Ukládám…` | |
| pending | `Čeká na uložení` | |
| error | `Chyba: {msg}` | Podtypy: čtení, zápis, autentizace (viz níže). |

**Rozhodnutí:**
- Stav musí odlišovat chybu čtení, chybu zápisu a chybu autentizace (např. prefix nebo `{msg}`).
- Indikátor je informativní; nesmí blokovat práci na canvasu.

---

## Chování, která jsou v první verzi záměrně konzervativní

- Smazání karty ve Figmě nemaže záznam v API.
- Zkopírovaná karta se stejným `uxlogEntityId` zůstává duplicitní reprezentací stejné entity.
- Karta bez sync metadata se do API sama nevytváří.
- Synchronizace se týká pouze aktuální stránky.

---

## Soubory k modifikaci

| Soubor | Změny |
|---|---|
| `figma-plugin/ui.html` | nová záložka `Nastavení` (URL, klíč, Připojit/Odpojit); síťová komunikace a polling v UI vrstvě; stavový pruh v záhlaví napříč záložkami (včetně stávajících Import/Export); rozšíření importu z API dle funkcí 2–4 |
| `figma-plugin/code.js` | detekce změn, debounce, update karet, nové pluginData, fallback kompatibilita |
| `figma-plugin/manifest.json` | případné povolení přístupu na potřebné domény přes `networkAccess` |

**Poznámka:**
- Změny v serverech mimo tento repozitář nejsou součástí této specifikace, pokud by porušily
  bezpečnostní pravidla projektu.

---

## Doporučené pořadí implementace

1. Uzavřít bezpečné řešení síťové architektury a CORS.
2. Přidat UI konfiguraci připojení a persistenci přes `figma.clientStorage`.
3. Přidat načtení projektů a import entit.
4. Rozšířit generátory karet o nová pluginData a `uxlogField`.
5. Přidat jednosměrný sync API → Figma.
6. Přidat debounced sync Figma → API.
7. Doplnit ochranu proti sync smyčkám.
8. Doplnit stavový indikátor a error states.

---

## Akceptační kritéria

- Uživatel může nakonfigurovat připojení bez blokace ostatních funkcí pluginu.
- Import entity vytvoří kartu se správnými sync metadaty.
- Změna textu na kartě se po debounce zapíše do API.
- Změna entity v API se po pollingu projeví na všech odpovídajících kartách na aktuální stránce.
- Staré karty bez `uxlogField` jsou stále čitelné a aktualizovatelné fallback logikou.
- Implementace nepřidává bezpečnostní výjimku typu `Access-Control-Allow-Origin: *` bez
  explicitního architektonického rozhodnutí.

---

## Reference v kódu

- Generování karet: `figma-plugin/code.js`
- Extrakce dat z karet: `figma-plugin/code.js`
- Manifest pluginu: `figma-plugin/manifest.json`
- Flexi API vrstva: `src/lib/flexiApi.js`
- Flexi sync logika: `src/lib/flexiSync.js`
