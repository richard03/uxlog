# CLAUDE.md

## Project Overview

**UXLog** - desktop app (Vue 3 + Vite + Tauri 2) for UX design process logging. Local-first, works offline. Plugins add optional connections (LLM, Flexi API, Figma).

## Agent Workflow
Before making changes:
- Read the relevant store/composable/lib files end-to-end.
- Check whether the change affects versioning, documentation, or persistence format.
When implementing:
- Keep business logic in `src/lib/` as pure functions.
- Keep stores focused on state orchestration and persistence.
- Keep composables focused on reactivity and UI-facing glue code.
Before finishing:
- Run the narrowest relevant test first, then broader validation if needed.
- Update `README.md`, `SPEC.md`, or `CLAUDE.md` when behavior, architecture, or workflow rules changed.


## Architecture Rules
- **Business logic in `src/lib/`** as pure, unit-testable functions. Stores handle state + persistence. Never mix UI logic into lib/.
- **Local-first:** Web build stores data in localStorage; desktop Tauri build stores data in embedded SQLite and exposes the same state to the local HTTP API. No external server required.
- **No cascading deletion:** Deleting an entity removes only relationship links, not related entities.
- **All user-facing texts** in `src/i18n/cs.js` - never hardcode Czech strings in components.
- **Plugins** (`src/lib/plugins/`) for optional features (AI, sync, Figma API). Don't add plugin logic to core.
- **Obrazovky projektu:** všechny routy `/project/:id/...` jsou potomky `ProjectLayout.vue` (`<router-view>` vlevo, Zápisník `NotebookChat` vpravo). Nové obrazovky projektu přidávejte jako `children` této routy; vlastní `.container` vnořené obrazovky layout zbavuje šířky a odsazení. Hlavičku obrazovky vždy tvořte komponentou `ProjectPageHeader` (teleportuje se přes celou šířku nad Zápisník; slot `#actions`, žádný viditelný h1). Levý sloupec (obsah obrazovky) začíná `ColumnHeading` (seznam: název sekce + tlačítko Přidat ve slotu `#actions`; detail: „Typ název“ + kód ve slotu `#sub`; přejmenování přes props `on-edit`/`edit-label` na `ColumnHeading`, drobková navigace editovat nejde).
- **Konfigurovatelná data v `/data/*.yaml`** (`activity-types.yaml`, `entities.yaml`, `app.yaml`), načítá je `src/lib/dataConfig.js` (`?raw` + `parseYaml(text, { config: true })` s tolerantní normalizací). Výchozí hodnoty entit, atributy formulářů, prefixy kódů, skóre úplnosti, katalog aktivit, barvy projektů a podobné hodnoty přidávej sem, ne do JS. Texty pro uživatele u entit zůstávají v `cs.js` (YAML odkazuje `labelKey`). Prefix kódu získávej přes `getCodePrefix` (ve views přes `useEntityHelpers`).
- **Metodika aktivit:** katalog typů aktivit v `data/activity-types.yaml` (checklist + `guide`), API `ACTIVITY_TYPES`/`getActivityType` v `src/lib/activityTypes.js`. Zdrojem je lokální `knowledge/` (export interní knihovny technik, v `.gitignore`) – nikdy ji nenačítej za běhu ani neposílej do AI; do aplikace přenášej jen převyprávěný postup bez jmen, klientů a odkazů (hlídá test). Id položek checklistu existujících typů neměň; nové typy mají `createOnNewProject: false`. Doporučení aktivit: `lib/activityRecommendations.js` → `getRecommendedActivities` ve store.
- **Nová entita projektu** (vzor: rizika `risks`): definice v `data/entities.yaml` + model + store + `storage.js`/`projects.js` seznamy + `exportImport.js` + `importLogic.js` + `search.js` + `EntityConnections`/`ImportModal`/`SearchModal` + `entityFieldDefaults`/`completeness` + i18n + routy + AI (`prompts.js`, `useNotebookChat`) + `ENTITY_COLLECTIONS` v `src-tauri/src/repository.rs` + `CANVAS_ENTITY_TYPES` (`lib/canvas.js`), `lib/entityRoutes.js`, `DELETE_BY_TYPE` (`stores/canvas.js`) a `I18N_SECTION` (`useCanvasSelectionActions`).
- **Historie změn projektu:** `persist()` předává rozdíl stavu do `stores/history.js` (čistá logika `lib/history.js`: `diffStates`, `buildRevertPatch`…); změny jedné synchronní akce = jeden záznam na projekt. Změny, které nedělá uživatel (sync z API), ukládej přes `persist({ history: false })`. Nové automaticky měněné pole, které nemá být v historii, přidej do `HISTORY_IGNORED_FIELDS`. Vrácení = nový záznam (`kind: 'revert'`). Odkaz „Historie“ vkládá `ProjectPageHeader` sám.
- **Canvas projektu** (`/project/:id/canvas`; v `AppHeader` vedle loga přepínač **Data** (poslední navštívená obrazovka projektu mimo Canvas) / **Canvas**; jediná obrazovka projektu s `meta.fullScreen` – `App.vue` ji natáhne na výšku okna, `ProjectLayout` skryje hlavičku a Zápisník přes `v-show`, takže se nepoužívá `ProjectPageHeader` ani `ColumnHeading`, ovládání plave nad plátnem): rozvržení v `project.canvas` (`positions` podle klíče `kolekce:id` + `viewport`), čistá logika `lib/canvas.js` (rozvržení, zoom, výběr obdélníkem, posun skupiny), store `stores/canvas.js` (`moveCanvasCards` = jedno uložení pro celou skupinu), ovládání myší/klávesnicí v `useProjectCanvas` (zapisuje mimo `updateProject`, aby neměnil `lastWorkedAt`; pole `canvas` je v `HISTORY_IGNORED_FIELDS`). Detail entity se z plátna otevírá v plovoucích oknech (víc najednou, nejsou v URL): čistá logika `lib/canvasWindows.js` (otevření, kaskáda, vrstvy přes `z` – pořadí v poli se nemění kvůli fokusu, přesun, změna velikosti), stav a tažení `useCanvasWindows`, okno `CanvasEntityWindow.vue` vykreslí stejnou komponentu detailu jako routa v Datech a podstrčí jí vlastní routu (`provide(routeLocationKey, …)`) – detaily proto smí z routy číst jen `params`. Okno poskytuje kontext `CANVAS_WINDOW_KEY`; `ProjectPageHeader` v něm teleportuje jen akce do lišty okna; Import a Export detaily v okně skrývají (`inCanvas` z `useEntityNavigation`). V detailech a jejich komponentách proto naviguj přes `useEntityNavigation` (`detailRoute`/`openDetail` na jiný detail, `leaveDetail` po smazání/přesunu), ne natvrdo `router.push` na routy Data; odkaz na jiný detail v okně musí zachytit klik a zavolat `openDetail` (vzor `EntityConnections`). Nová entita projektu → přidej její kolekci do `CANVAS_ENTITY_TYPES` a routu do `lib/entityRoutes.js`. Filtr typů na horní hraně (zvýraznění typu, ostatní kartičky `opacity: 0.15`): stav `typeFilter` v `useProjectCanvas`, logika `canvasTypeCounts`/`isCardFilteredOut`; pruh pod ním `CANVAS_TOP_INSET` (`lib/canvas.js`) respektuje výchozí pohled, „Zobrazit vše“ i umístění lišty výběru – nové plovoucí ovládání nahoře se do něj musí vejít. Kontextová lišta výběru: `CanvasSelectionToolbar.vue` (pozice `toolbarStyle` z `useProjectCanvas`, akce `useCanvasSelectionActions`); barva kartičky je v `project.canvas.colors` (paleta `canvasCardColors` v `data/app.yaml`, kontrast písma `lib/color.js`); mazání z plátna jde přes `deleteCanvasCards` → běžné `delete*` funkce entit (nová entita → doplň ji do `DELETE_BY_TYPE` ve `stores/canvas.js` a sekci i18n do `useCanvasSelectionActions`); hromadný přesun/kopie `moveEntitiesToProject`/`copyEntitiesToProject` (`MoveToProjectModal` s prop `entities`).
- **Custom CSS design system** with CSS variables in `src/style.css` - no external UI library.
- **Náhled čekajících změn (AI / import):** společné `pending-review.css` (třídy `pr-*`, načteno v `main.js`) a komponenty `PendingReviewLayout.vue` (horní lišta + scrollovatelný seznam), `PendingReviewRow.vue` (sbalitelný řádek s tlačítky Potvrdit/Přeskočit), `PendingReviewAiFields.vue` (textarea pole z objektu `fields`). Používá `NotebookModal` (revize návrhů AI ke zprávě ze zápisníku – chat `NotebookChat.vue` + `useNotebookChat`, historie v `lib/notebookChat.js`) a `CompetitionAnalysisModal`; `ImportModal` sdílí jen `PendingReviewRow` a v těle řádku vlastní diff + `ImportFieldEditor`.

## Versioning
The app version is stored in `src/lib/version.js` as `APP_VERSION`.
Update the patch version only for user-visible or release-relevant changes.
Keep `src/lib/version.js`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` in sync for every release build.
Do not change the version for documentation-only edits unless the task explicitly requires a release/version bump.

## Documentation
Update `README.md`, `SPEC.md`, or `CLAUDE.md` when behavior, architecture, or workflow rules changed. Keep `CLAUDE.md`, `SPEC.md`, and `README.md` aligned with the current product and architecture.

- `CLAUDE.md`: concise operating rules for AI agents and contributors working inside this repository.
- `SPEC.md`: product behavior, domain model, workflows, constraints, and invariants. It should be implementation-agnostic where possible, but specific enough to recreate the app in another stack.
- `README.md`: fast onboarding for developers, including setup, commands, and high-level architecture.

## Code Quality Rules

### Pure Functions & Testability
- Business logic must be implemented using pure functions (no side effects) to be easily testable.

### Robustness
- Data may be corrupted, incomplete, or from an older version of the software. Every function that reads stored data must tolerate missing fields (default values, optional chaining) and handle various anomalies.
- Relationships may refer to deleted entities. Always filter out non-existent IDs before displaying them.
- The default form of an entity is defined by Factory functions. If you find that some data is missing while reading, use the defaults from the factory.

### Security
- Never render untrusted raw HTML directly in the UI.
- Prefer Markdown as the internal rich-text format.
- When HTML input is unavoidable, sanitize and normalize it before storing or rendering.
- Only render HTML from trusted, sanitized Markdown/output pipelines.
- The plugin API must not access other plugins or internal store functions outside the provided context (ctx).
- API keys (OpenAI, Gemini) are stored only within the application (localStorage); they are never logged or sent over the Internet to any destination other than the relevant API.

### Performance
- The application should be as non-blocking as possible. Wherever it is practical, use asynchronous code (Promises, etc.)
- User should never wait more than 3s for the reaction to his actions. If there is no way to provide correct response, show some waiting message at least.
- Do not use deep watch on the entire state. Only watch the specific keys that the view needs.

### Architectural Purity
- Components render UI and emit user intent.
- Composables contain reactivity, derived UI state, and calls to stores.
- Stores coordinate state changes, persistence, and calls to Libraries.
- Libraries contains pure business logic and data transformation functions.
- All user-facing application text must go through the i18n layer. Do not hardcode UI strings in components, composables, or stores.

Dependency direction:
- View -> Composable -> Store -> Lib
- Views must not call Lib directly.
- Stores must not import UI components.
- If a small exception is needed, document the reason in code and keep the dependency one-way.

### Testing
- Write tests for every new pure function.
- Add focused tests for stores or composables when they contain non-trivial behavior, persistence logic, or regression-prone branching.
- Cover main path, edge cases, and invalid inputs.