**UXLog** is a desktop application for UX design process logging and cooperation with Figma. It operates in a closed environment without internet connection; plugins may add connections such as LLM services or external APIs.

## Data Model

### Entities (per project)
       
**Projects** - name, scope (small/medium/large), priority (High/Medium/Low), phase (Research/Design/Development), deadline, notebook history (`notebookHistory`: messages `{ id, createdAt, mode: process|ask, text, answer, status: processing|done|error|saved, error, outcomes[] }`). Last-worked date is recorded automatically. The legacy plain-text `notebook` field is read as the first history message ("original notebook") and moved into the history on the next message.

**Goals** - code, name, description, metrics

**Stakeholders** - name, description, influence level, interest level (Mendelow matrix)

**Competition** - name, description, strengths, weaknesses, inspiration

**Hypotheses** - code, name, description, status (untested/tested/refuted), explanation

**Personas** - code, name, status (protopersona/persona), description, motivation, needs, problems, target group size, target group value

**Scenarios** - code, name, description, frequency, value, MoSCoW rating

**Requirements** - code, name, description, motivation, MoSCoW rating, explanation (for "Won't have")

**Activities** - configurable task templates with checklists & deadlines; each checklist item may spawn a linked **Task** (the checklist row remains); the new task is automatically added as a connection to the activity (`checklistItemTaskIds` maps checklist item id → task id). **Assign task** (UI: „Zadat úkol“) from an activity (project list or activity header) opens the same **Add task** dialog as the Tasks section, with the task **name prefilled from the activity name**; on Save the task is created and linked only via **EntityConnections** (no checklist item link). Creating from a **checklist row** still uses the same Add task dialog with the step label as the prefilled name and keeps the checklist item link. Opening an already linked checklist task goes to the task detail page.

**Tasks** - SMART goals with due dates & assignees

**Bugs** - issue tracking with severity/impact/priority

**Team Members** - project team roster with roles



### Relationships (many-to-many, no cascading deletion)
 Arbitrary connections between any entities via `EntityConnections`. The connections panel **hides** rows where the linked entity was deleted (no placeholder row); orphan records may still exist in stored data until manually pruned or a future cleanup.



## Plugin System
Event-driven plugin registrywith capabilities and event bus.
       
       
**Built-in plugins:**

**data-status** - tracks last sync timestamp

 **tauri-local-api** - HTTP API server on localhost (desktop <-> Figma communication)
       
**flexi** - optional sync to Flexi API backend

**openai** - ChatGPT integration (notebook processing `ai:notebook`, notebook questions `ai:ask`, connection suggestions)

**gemini** - Google Gemini AI (same capabilities as OpenAI)

**ai-shared** - shared AI utilities (key management, prompts)


## Key Features
Project screens layout: every screen inside a project (project detail, activity detail, artifact lists and artifact details) starts with a full-width header – project colour, breadcrumb navigation (no large page title; on detail screens clicking the last breadcrumb item renames the entity / edits the project), screen actions (Import, Export, menu) aligned right. Project metadata (priority, scope, last activity) is shown only in the project list. Below it the **Notebook** chat taking the left half of the width (sticky while scrolling, same content and behaviour everywhere, unsent draft kept when navigating within the project); the selected screen fills the right half. On narrow screens the chat moves below the content. The right column starts with a column heading styled like "Notebook": entity lists show the plural section name (e.g. "Personas") with the add button aligned right; entity and activity details show "<type> <name>" (e.g. "Persona Jana") with the editable code below it where the entity has one (stakeholders show their strategy badge there).
Project detail: the right half is split evenly between the **Activities** list (status and checklist progress under each activity name) and the **Artifacts** list (one row per section – personas, scenarios, requirements, … – with counts, linking to each section).
Notebook chat: the user sends a text message (Ctrl+Enter); every message is kept permanently in the project's notebook history (no editing or deletion). A select left of the send button switches between two modes: **Ask** (button "Send question") – AI only answers in text using the project's data (all entities incl. activities, tasks, bugs, their custom fields, and for every item its connections from **EntityConnections** – items without connections are explicitly marked as having none; legacy ID-list fields such as `scenarioIds` are not used) and earlier notebook messages; it never writes to entities or anywhere else (only the question and answer are kept in the history); requires AI. **Enter information** (button "Process") – the processing flow below. If AI is available, the message is processed and the proposed create/update actions are reviewed in a dialog (confirm / skip each, or all); actions left unconfirmed when the dialog closes count as skipped. The AI reply under the message summarises the outcome (written / skipped per entity). Long messages and replies are shortened to a few lines; clicking them (or "Show all") expands them. The history scrolls without a visible scrollbar and stays at the newest message. Without AI the message is just saved. Failed or interrupted processing can be retried.
Project list: compact tasks-count tag links to the project’s Tasks section (if any tasks are overdue, URL may include `?overdue=1` to turn on the overdue filter). Tasks list: **by default the “incomplete” filter is on** (only incomplete tasks); **filter and search text persist in memory per project for the browser tab session**, so returning from a task detail restores the same filters. Incomplete overdue items are visually emphasized; “Prošlé” filter matches any task whose due date is in the past. Multi-select list filters (tasks, bugs, requirements, personas, hypotheses, scenarios) use **OR**: an item appears if it matches **at least one** active badge.
Full-text search across all entity fields
JSON and YAML export/import with conflict resolution (import preview: collapsed rows with id/title and create vs update; “import all” / “reject entire import”; per-row expand for diff, edit, single import or skip; list closes when nothing remains)
Dark/light theme with CSS variable tokens
Accessibility (ARIA labels, keyboard navigation, skip links, screen reader support)
AI-powered notebook and entity connection suggestions (via plugins)
Figma integration via local HTTP API + Figma plugin
Custom entity fields configuration
Activity templates with checklists
Project completeness scoring
Drag & drop ordering