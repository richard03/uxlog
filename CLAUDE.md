# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UXLog** is a desktop application for UX design process logging and cooperation with Figma. Built with **Vue 3 + Vite** frontend and **Tauri 2** (Rust) for desktop. It operates in a closed environment without internet connection; plugins may add connections such as LLM services or external APIs.

**Current version:** see `src/lib/version.js` (`APP_VERSION`).

## Tech Stack

- **Frontend:** Vue 3 (Composition API), Vue Router 4, Vite 5
- **Desktop:** Tauri 2 (Rust backend, WebView2 on Windows)
- **Testing:** Vitest + Vue Test Utils
- **Data storage:** localStorage (browser) + file mirror via Tauri bridge
- **UI:** Custom CSS design system (no external UI library), CSS variables for theming
- **i18n:** Custom composable (`src/i18n/cs.js` - Czech)

## Directory Structure

```
src/
  components/        # Reusable Vue components (form/, EntityConnections, modals, etc.)
  composables/       # Vue 3 composables (useStore, useI18n, useTheme, usePlugin, useConfig, etc.)
  views/             # Page-level components (28 views)
  lib/
    stores/          # State management (state.js, per-entity store modules, relations.js, connections.js, exportImport.js)
    plugins/         # Plugin system (registry.js, install.js, + built-in plugins)
    models.js        # Entity factory functions (pure, unit-testable)
    storage.js       # localStorage + Tauri persistence
    search.js        # Full-text search across all entities
    configStore.js   # Custom fields, activity templates, deadlines
    yaml.js          # YAML export/import
    importLogic.js   # Import with conflict resolution
    relations.js     # Bi-directional relationship management
    tauriBridge.js   # Tauri interop (file storage, HTTP API)
    version.js       # App version constant
    deadline.js      # Date/deadline utilities
    completeness.js  # Project completeness scoring
    activity.js      # Activity model
    activityTypes.js # Predefined activity templates
    aiKeys.js        # AI key management
    aiProcessor.js   # AI processing
  router/index.js    # 30+ routes
  i18n/cs.js         # Czech translations
  style.css          # Design system tokens (dark/light theme)
src-tauri/           # Tauri Rust backend (http_api.rs, storage.rs)
figma-plugin/        # Figma plugin (connects to UXLog via local HTTP API)
```

## Data Model

### Entities (per project)

- **Projects** - name, scope (small/medium/large), priority (High/Medium/Low), phase (Research/Design/Development), deadline, notebook. Last-worked date is recorded automatically.
- **Goals** - code, name, description, metrics
- **Stakeholders** - name, description, influence level, interest level (Mendelow matrix)
- **Competition** - name, description, strengths, weaknesses, inspiration
- **Hypotheses** - code, name, description, status (untested/tested/refuted), explanation
- **Personas** - code, name, status (protopersona/persona), description, motivation, needs, problems, target group size, target group value
- **Scenarios** - code, name, description, frequency, value, MoSCoW rating
- **Requirements** - code, name, description, motivation, MoSCoW rating, explanation (for "Won't have")
- **Activities** - configurable task templates with checklists & deadlines
- **Tasks** - SMART goals with due dates & assignees
- **Bugs** - issue tracking with severity/impact/priority
- **Team Members** - project team roster with roles

### Relationships (many-to-many, no cascading deletion)
- Arbitrary connections between any entities via `EntityConnections`

## Plugin System
Event-driven plugin registry (`src/lib/plugins/registry.js`) with capabilities and event bus.

**Built-in plugins:**
- **data-status** - tracks last sync timestamp
- **tauri-local-api** - HTTP API server on localhost:8000 (desktop, Figma communication)
- **flexi** - optional sync to Flexi API backend
- **openai** - ChatGPT integration (notebook, connection suggestions)
- **gemini** - Google Gemini AI (same capabilities as OpenAI)
- **ai-shared** - shared AI utilities (key management, prompts)

## Key Features
- Full-text search across all entity fields
- JSON and YAML export/import with conflict resolution
- Dark/light theme with CSS variable tokens
- Accessibility (ARIA labels, keyboard navigation, skip links, screen reader support)
- AI-powered notebook and entity connection suggestions (via plugins)
- Figma integration via local HTTP API + Figma plugin
- Custom entity fields configuration
- Activity templates with checklists
- Project completeness scoring
- Drag & drop ordering

## Development Commands

```bash
npm run dev           # Vite dev server (:5173)
npm run build         # Build for web (dist/)
npm run preview       # Preview production build
npm test              # Run tests once (Vitest)
npm run test:watch    # Tests in watch mode
npm run tauri:dev     # Tauri dev (WebView + Vite)
npm run tauri:build   # Build desktop installer
```

## Architecture Principles

- **Business logic separation:** All business logic lives in `src/lib/` as pure, unit-testable functions. Store modules handle state + persistence.
- **Local-first:** All data in localStorage, no server required. Optional sync via plugins.
- **No cascading deletion:** Deleting an entity does not remove related entities, only the relationship links.
- **Translations:** All user-facing texts in `src/i18n/cs.js` for easy translation.
- **Plugin extensibility:** Features like AI and sync are plugins, not core code.

## Versioning

The application version is stored in `src/lib/version.js` as `APP_VERSION`. **Increment the patch number** (e.g. `1.0.0` -> `1.0.1`) with every change made to the codebase, before finishing the task. Also update version in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` when changing Tauri-related code.
