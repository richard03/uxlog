**UXLog** is a desktop application for UX design process logging and cooperation with Figma. It operates in a closed environment without internet connection; plugins may add connections such as LLM services or external APIs.

## Data Model

### Entities (per project)
       
**Projects** - name, scope (small/medium/large), priority (High/Medium/Low), phase (Research/Design/Development), deadline, notebook. Last-worked date is recorded automatically.

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

**openai** - ChatGPT integration (notebook, connection suggestions)

**gemini** - Google Gemini AI (same capabilities as OpenAI)

**ai-shared** - shared AI utilities (key management, prompts)


## Key Features
Project list: compact tasks-count tag links to the project’s Tasks section (if any tasks are overdue, URL may include `?overdue=1` to turn on the overdue filter). Tasks list: incomplete overdue items are visually emphasized; “Prošlé” filter matches any task whose due date is in the past. Multi-select list filters (tasks, bugs, requirements, personas, hypotheses, scenarios) use **OR**: an item appears if it matches **at least one** active badge.
Full-text search across all entity fields
JSON and YAML export/import with conflict resolution
Dark/light theme with CSS variable tokens
Accessibility (ARIA labels, keyboard navigation, skip links, screen reader support)
AI-powered notebook and entity connection suggestions (via plugins)
Figma integration via local HTTP API + Figma plugin
Custom entity fields configuration
Activity templates with checklists
Project completeness scoring
Drag & drop ordering