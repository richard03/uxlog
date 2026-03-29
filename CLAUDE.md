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
- **Local-first:** All data in localStorage, mirrored to disk via Tauri. No server required.
- **No cascading deletion:** Deleting an entity removes only relationship links, not related entities.
- **All user-facing texts** in `src/i18n/cs.js` - never hardcode Czech strings in components.
- **Plugins** (`src/lib/plugins/`) for optional features (AI, sync, Figma API). Don't add plugin logic to core.
- **Custom CSS design system** with CSS variables in `src/style.css` - no external UI library.

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