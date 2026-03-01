# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UXLog** is a web application for UX design process logging, served at `https://uxlog.prokoho.cz`. It uses a PHP backend API and a Vue.js client frontend.

The application allows users to create a list of projects. For each project, the name, scope, priority, and phase are recorded. The date when the user last worked on the project is recorded automatically (on create, update, task/member changes, Figma sync).

- The scope of the project can be set to "small" (work lasting a few days or weeks), "medium" (work lasting 1-3 months), and "large" (work lasting more than 3 months).
- The priority of the project can be set to "High" (requires daily work), "Medium" (needs to be checked once a week), and "Low" (occasional work).
- The phase of the project can be "Research," "Design," "Development"

When the user goes to the project details, they will see the individual areas they can focus on:
- Goals
- Stakeholders
- Competition
- Personas
- Requirements
- Scenarios

They can click on each of these sections. They will see both the current items (goals, stakeholders etc.) and the action to add a new item.


## Architecture

```
api/        PHP backend API
client/     Vue.js frontend (Vite, Pinia, Vue Router)
```

**Backend**: PHP with MySQL database (`prokohocz13` on `127.0.0.1`).

**Authentication**: Google OAuth via `POST /auth/google`.

**Rate limiting**: 10 req/min per IP on auth endpoints, 120 req/min per user on other endpoints.

**CORS**: Only `https://uxlog.prokoho.cz` is allowed.

## Configuration

`api/config.php` is gitignored (it contains database credentials). When setting up locally, copy `api/config.example.php` to `api/config.php` and fill in the values:

- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_CHARSET`
- `ALLOWED_ORIGIN` – CORS origin of the client app
- `RATE_LIMIT_AUTH`, `RATE_LIMIT_API` – requests per minute
- `DEBUG` – set to `false` in production (currently `true`)

Other PHP files in `api/` include config with:
```php
require_once __DIR__ . '/config.php';
```
