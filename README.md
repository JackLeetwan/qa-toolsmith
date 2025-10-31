# QA Toolsmith

[![CI](https://github.com/JackLeetwan/qa-toolsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/JackLeetwan/qa-toolsmith/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://qa-toolsmith.pages.dev/)

**[🔗 Zobacz demo na żywo](https://qa-toolsmith.pages.dev/)**

## O projekcie

QA Toolsmith to lekkie, otwartoźródłowe narzędzie dla testerów, które porządkuje codzienną pracę: szybkie tworzenie raportów defektów, eksplorację z notatkami i czasomierzem, prostą bazę wiedzy oraz generowanie danych testowych (np. IBAN DE/AT z walidacją). Skupiamy się na prostocie, szybkości i gotowości do użycia „od ręki".

### Stack technologiczny

- **Framework:** Astro 5 (SSR) z adapterem Cloudflare Pages
- **Frontend:** React 19 z TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **AI:** OpenRouter integracja dla ulepszania treści
- **Testowanie:** Vitest (unit), Playwright (E2E)
- **CI/CD:** GitHub Actions
- **Hosting:** Cloudflare Pages

### Najważniejsze możliwości

- ✅ Logowanie e‑mail/hasło, role: Admin i User
- ✅ Generator i walidator IBAN (DE/AT), tryb deterministyczny przez seed
- ✅ Stabilny zestaw testów (unit + E2E) i gotowy pipeline CI (KB testy wymagające autoryzacji tymczasowo pomijane)
- 🚧 Szablony raportów defektów z eksportem do Markdown
- 🚧 Exploration Charter: notatki z tagami, timer, skróty klawiaturowe
- ✅ Prosta Knowledge Base: CRUD, tagi, publiczny dostęp, eksport JSON
- 📋 Kolejne generatory danych (tel., adres, tablice, e‑mail, firma, karty, GUID, stringi)
- 📋 Opcjonalny asystent AI do ulepszania treści (limity dzienne)

## Szybki start

Wymagania: Node.js 22.14.0, npm

```bash
git clone https://github.com/JackLeetwan/qa-toolsmith.git
cd qa-toolsmith
npm install
npm run dev
```

Podgląd produkcyjny lokalnie:

```bash
npm run build
npm run preview
```

Podstawowe komendy:

- `npm run dev` – tryb deweloperski
- `npm run build` – budowa produkcyjna
- `npm run preview` – podgląd produkcyjny
- `npm run test` – testy (unit + E2E)

## API i generatory

Pełny opis endpointów (m.in. IBAN Generator/Validator, Knowledge Base) znajdziesz w dokumentacji API: `docs/api.md`.

- Przykład: `GET /api/generators/iban?country=DE[&seed=...]`
- Przykład: `GET /api/validators/iban?iban=...`
- Przykład: `GET /api/kb/entries` - lista wpisów Knowledge Base (publiczny dostęp)
- Przykład: `POST /api/kb/entries` - tworzenie wpisu (wymaga autentykacji)

Uwaga: publiczne wpisy KB (is_public=true) mają ograniczenia admin-only dla operacji tworzenia/edycji/usuwania. Szczegóły błędów 401/403/404 w `docs/api.md`.

Krótki skrót zasad i wpływu na UI: `docs/kb-admin-restrictions.md`.

## Wdrożenie

Projekt działa świetnie na Cloudflare Pages (SSR). Krótki przegląd:

- globalna infrastruktura (Workers), dobry darmowy próg,
- kompatybilne SSR (Astro), proste środowiska i podglądy PR.

Instrukcja krok‑po‑kroku: `docs/deployment-cloudflare.md`.

## Gdzie szukać szczegółów

- Architektura i decyzje techniczne: `.ai/ARCHITECTURE.md`
- PRD i user stories: `.ai/prd.md`
- Dokumentacja API: `docs/api.md`
- Technologia i konfiguracja: `docs/tech-stack.md`
- Przewodnik wdrożenia (Cloudflare): `docs/deployment-cloudflare.md`
- Setup (PL): `docs/SETUP_GUIDE.md`
- Bezpieczeństwo: `docs/SECURITY.md`

## Status projektu

- ✅ **Produkcyjna wersja** dostępna na [qa-toolsmith.pages.dev](https://qa-toolsmith.pages.dev/)
- ✅ **Pełne MVP** z autentykacją, CRUD Knowledge Base, generatorami danych
- ✅ **AI integracja** dla ulepszania treści z limitami dziennymi
- ✅ **Kompletny CI/CD** z testami automatycznymi
- 🚧 Rozwijane: szablony raportów i exploration charters (placeholder dostępne)

## Licencja

MIT – zobacz plik `LICENSE`.
