# QA Toolsmith (MVP)

[![CI](https://github.com/<USERNAME>/<REPO>/actions/workflows/ci.yml/badge.svg)](https://github.com/<USERNAME>/<REPO>/actions)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Table of Contents

1. [Project Description](#project-description)  
2. [Tech Stack](#tech-stack)  
3. [Getting Started Locally](#getting-started-locally)  
4. [Available Scripts](#available-scripts)  
5. [Project Scope](#project-scope)  
6. [Project Status](#project-status)  
7. [License](#license)  

## Project Description

QA Toolsmith is an open-source, lightweight web application that standardizes and automates common tasks for software testers. The MVP offers:

- Email/password authentication with Admin and User roles  
- Defect report templates (UI/API bugs) with Markdown export  
- Exploration Chart (timer, tagged notes, keyboard shortcuts, Markdown export)  
- Minimal Knowledge Base (CRUD, tags, full-text search, JSON export)  
- Synthetic test data generators & validators (IBAN DE/AT, phone, address, license plates, email, companies, credit cards, GUIDs, strings)  
- Optional AI assistant to polish content (per-user daily limit, dry-run/manual fallback)  
- Unit tests, E2E tests, and GitHub Actions CI/CD pipeline  

## Tech Stack

- **Frontend**  
  - Astro 5  
  - React 19  
  - TypeScript 5  
  - Tailwind CSS 4  
  - Shadcn/ui  
- **Backend**  
  - Supabase (PostgreSQL, Auth, SDK)  
- **AI Integration**  
  - Openrouter.ai (supports OpenAI, Anthropic, Google, etc.)  
- **CI/CD & Hosting**  
  - GitHub Actions  
  - Docker (DigitalOcean)  

## Getting Started Locally

### Prerequisites

- Node.js v22.14.0 (see `.nvmrc`)  
- npm (included with Node.js)  

### Installation

```bash
git clone https://github.com/<USERNAME>/<REPO>.git
cd <REPO>
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

## Available Scripts

- `npm run dev` — Start development server  
- `npm run build` — Build for production  
- `npm run preview` — Preview production build  
- `npm run astro` — Run Astro CLI commands  
- `npm run lint` — Run ESLint checks  
- `npm run lint:fix` — Automatically fix lint issues  
- `npm run format` — Format files with Prettier  

## Project Scope

### 1. Authentication & Roles
- Email/password sign-in/out  
- Admin & User roles (first Admin seeded)  
- Login rate limiting and temporary lockout  

### 2. Defect Report Templates
- UI & API bug presets with required fields  
- Global templates managed by Admin; Users can fork & customize  
- Markdown export & "Copy to clipboard" button  

### 3. Exploration Chart
- Charters with Goal, Hypotheses, Notes (tags: bug / idea / question / risk)  
- Start/Stop timer, keyboard shortcuts (Alt+N, Alt+T, Alt+S)  
- Autosave (localStorage every 5 s, DB on close)  
- Markdown export & session history  

### 4. Knowledge Base
- CRUD for links with canonicalization & deduplication  
- Multiple notes per link, tag support  
- Full-text search (Postgres FTS) & tag filtering  
- JSON export of entries  

### 5. Data Generators & Validators
- IBAN generator & validator (DE/AT)  
- Phone numbers, addresses, license plates, emails, company names, credit cards, GUIDs, random strings  
- Optional seed for deterministic results  

### 6. AI Assistant
- “Improve / Expand” actions for descriptions, steps, notes  
- Diff preview with accept/reject  
- Per-user daily limit (`AI_MAX_REQUESTS_PER_USER_PER_DAY`), dry-run & manual fallback  

### 7. Testing & CI/CD
- **Unit tests**: IBAN validator, generator & edge cases (property-based, 1 000 cases)  
- **E2E tests**: Playwright (login → KB CRUD)  
- **Smoke tests**: GET /health, homepage render, login, sample CRUD  
- **CI/CD**: GitHub Actions pipeline for lint, unit, E2E  

## Project Status

- **MVP Complete** (v0.0.1)  
- Actively maintained feature set for testers’ core workflows  

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.
