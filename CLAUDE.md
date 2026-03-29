# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UXLog** is a desktop application for UX design process logging and cooperation with Figma. It is able to operate in closed environment without internet connection, however plugins may add connections such as LLM services or external APIs.

The application allows users to create a list of projects. For each project, the name, scope, priority, and phase are recorded. The date when the user last worked on the project is recorded automatically.

- The scope of the project can be set to "small" (work lasting a few days or weeks), "medium" (work lasting 1-3 months), and "large" (work lasting more than 3 months).
- The priority of the project can be set to "High" (requires daily work), "Medium" (needs to be checked once a week), and "Low" (occasional work).
- The phase of the project can be "Research," "Design," "Development"

When the user goes to the project details, they will see the individual areas they can focus on:
- Goals and metrics
- Stakeholders
- Competition
- Hypothesis
- Personas
- Requirements
- Scenarios

They can click on each of these sections. There they will see both the current items (goals, stakeholders etc.) and the action to add a new item.
- "Goals" - each goal has a code, a name, description, and metrics (how we know we reached the goal).
- "Stakeholders" may be people or interest groups - each has the name, description, influence level and interest level.
- "Competition" are companies or websites. Each has the name, description, strengths, weaknesses and inspiration for our project.
- "Hypothesis" - each has a code, name, description, status (untested, tested, refuted) and explanation (how was it refuted)
- "Personas" - each has a code, name, status (protopersona, persona), description, motivation, needs, problems, target group size and target group value. 
- "Scenarios" - each should have a code, name, description, frequency, value and MoSCoW rating. 
- "Requirements" - Each requirement has a code, name, description, motivation (what will happen if the requirement is not met), MoSCoW rating, and if it is "Won't have," then also an explanation of why it won't not be met.

Each stakeholder may have a list of related requirements, empty by default.
Each hypothesis may have a list of related requirements , empty by default.
Each persona may have a list of related scenarios. By default, all new scenarios are added, but a user may remove some of them.
Each scenario may have a list of related hypothesis, empty by default.
Each persona may have a list of related requirements, empty by default.
Each requirement may have a list of conflicting requirements, empty by default.
Each requirement may have a list of scenarios it affects. By default, all new scenarios are added, user may remove some of them.
Each requirement may have a list of stakeholoders, empty by default.
Each scenario may have a list of related personas. By default, all new personas are added, but a user may remove some of them.
Each scenario may have a list of related hypothesis, empty by default.
Each scenario may have a list of related requirements. By default, all new requirements are added, user may remove some of them.

I don't want cascading deletion. For example, if I delete a stakeholder who has some requirements in their list, the requirements will remain in the system.

I need a fulltext search over all codes, names, descriptions and other text attributes.

There must be an export of all data in JSON format.


The user interface must support dark mode, be accessible to voice readers, and must be built from components of the design system you choose.
The business logic must be fully separated from other code into unit testable functions. All the data must be stored in local storage. All texts must be in a separate file for easy translation.


## Versioning

The application version is stored in `src/lib/version.js` as `APP_VERSION`. **Increment the patch number** (e.g. `1.0.0` → `1.0.1`) with every change made to the codebase, before finishing the task.

