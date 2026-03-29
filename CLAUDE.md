# CLAUDE.md

## Project Overview

**UXLog** - desktop app (Vue 3 + Vite + Tauri 2) for UX design process logging. Local-first, works offline. Plugins add optional connections (LLM, Flexi API, Figma).

## Architecture Rules

- **Business logic in `src/lib/`** as pure, unit-testable functions. Stores handle state + persistence. Never mix UI logic into lib/.
- **Local-first:** All data in localStorage, mirrored to disk via Tauri. No server required.
- **No cascading deletion:** Deleting an entity removes only relationship links, not related entities.
- **All user-facing texts** in `src/i18n/cs.js` - never hardcode Czech strings in components.
- **Plugins** (`src/lib/plugins/`) for optional features (AI, sync, Figma API). Don't add plugin logic to core.
- **Custom CSS design system** with CSS variables in `src/style.css` - no external UI library.

## Versioning

Version is in `src/lib/version.js` as `APP_VERSION`. **Increment patch number** (e.g. `1.2.18` -> `1.2.19`) with every change. Also update `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` when changing Tauri code.

## Documentation
CLAUDE.md, SPEC.md and README.md should stay updated. 

**CLAUDE.md** should stay optimized for efficient CLAUDE operation.

**SPEC.md** should be detailed enogh to rebuild application from scratch in another tech stack if needed. There should be no technology specific details.

**README.md** serves as fast introduction for new developers.

## Commands

`npm run dev` | `npm test` | `npm run build` | `npm run tauri:dev` | `npm run tauri:build`

