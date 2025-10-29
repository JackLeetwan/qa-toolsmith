# QA Toolsmith

[![CI](https://github.com/jakub-litkowski/qa-toolsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/jakub-litkowski/qa-toolsmith/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## O projekcie

QA Toolsmith to lekkie, otwartoźródłowe narzędzie dla testerów, które porządkuje codzienną pracę: szybkie tworzenie raportów defektów, eksplorację z notatkami i czasomierzem, prostą bazę wiedzy oraz generowanie danych testowych (np. IBAN DE/AT z walidacją). Skupiamy się na prostocie, szybkości i gotowości do użycia „od ręki”.

### Najważniejsze możliwości
- ✅ Logowanie e‑mail/hasło, role: Admin i User
- ✅ Generator i walidator IBAN (DE/AT), tryb deterministyczny przez seed
- ✅ Stabilny zestaw testów (unit + E2E) i gotowy pipeline CI
- 🚧 Szablony raportów defektów z eksportem do Markdown
- 🚧 Exploration Charter: notatki z tagami, timer, skróty klawiaturowe
- 🚧 Prosta Knowledge Base: CRUD, tagi, wyszukiwanie, eksport JSON
- 📋 Kolejne generatory danych (tel., adres, tablice, e‑mail, firma, karty, GUID, stringi)
- 📋 Opcjonalny asystent AI do ulepszania treści (limity dzienne)

## Szybki start

Wymagania: Node.js 22.14.0, npm

```bash
git clone https://github.com/jakub-litkowski/qa-toolsmith.git
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

Pełny opis endpointów (m.in. IBAN Generator/Validator) znajdziesz w dokumentacji API: `docs/api.md`.

- Przykład: `GET /api/generators/iban?country=DE[&seed=...]`
- Przykład: `GET /api/validators/iban?iban=...`

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

- MVP gotowe (v0.0.1). Aktywnie rozwijane funkcje dla kluczowych zadań QA.

## Licencja

MIT – zobacz plik `LICENSE`.