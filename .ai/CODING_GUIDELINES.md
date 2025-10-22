# AI Rules for QA Toolsmith

QA Toolsmith (MVP) is an open-source, lightweight web app that standardizes testers' daily work. It includes email/password auth with admin/user roles, defect report templates with quick copy/export to Markdown, an Exploration Charter (timer, tags, Markdown export), and a minimal Knowledge Base (CRUD, tags, search). Built-in generators/validators produce synthetic test data for PL/DE/AT (incl. IBAN DE/AT). An optional AI assistant can polish content with a per-user daily limit and a safe manual fallback. The MVP ships with unit and E2E tests plus a CI/CD pipeline, and deliberately excludes external integrations and file uploads to keep deployment simple and secure.

## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

## Coding practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.

## Frontend

### General Guidelines

- Use Astro components (.astro) for static content and layout
- Implement framework components in React only when interactivity is needed

### Guidelines for Styling

#### Tailwind

- Use the @layer directive to organize styles into components, utilities, and base layers
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus-visible:, active:, etc.) for interactive elements

### Guidelines for Accessibility

#### ARIA Best Practices

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements

### Guidelines for Astro

- Leverage View Transitions API for smooth page transitions (use ClientRouter)
- Use content collections with type safety for blog posts, documentation, etc.
- Leverage Server Endpoints for API routes
- Use POST, GET - uppercase format for endpoint handlers
- Use `export const prerender = false` for API routes
- Use zod for input validation in API routes
- Extract logic into services in `src/lib/services`
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

### Guidelines for React

- Use functional components with hooks instead of class components
- Never use "use client" and other Next.js directives as we use React with Astro
- Extract logic into custom hooks in `src/components/hooks`
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Use supabase from context.locals in Astro routes instead of importing supabaseClient directly
- Use SupabaseClient type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`

## Supabase Auth Integration with Astro

Use this guide to introduce authentication (sign-up & sign-in) in Astro applications with server-side rendering (SSR) support

### Before we start

VERY IMPORTANT: Ask me which pages or components should behave differently after introducing authentication. Adjust further steps accordingly.

### Core Requirements

1. Use `@supabase/ssr` package (NOT auth-helpers)
2. Use ONLY `getAll` and `setAll` for cookie management
3. NEVER use individual `get`, `set`, or `remove` cookie methods
4. Implement proper session management with middleware based on JWT (Supabase Auth)

### Installation

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### Environment Variables

Create `.env` file with required Supabase credentials (based on the snippet below or `.env.example` in project root)

```env
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_anon_key
```

For better TypeScript support, create or update `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

When introducing new env variables or values stored on Astro.locals, always update `src/env.d.ts` to reflect these changes.

Make sure `.env.example` is updated with the correct environment variables.

### Implementation Steps

#### 1. Create OR Extend Supabase Server Instance

Update existing Supabase client or create one in `src/db/supabase.client.ts`:

```typescript
import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { Database } from '../db/database.types.ts';

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};
```

#### 2. Implement OR Extend Authentication Middleware

Update existing auth middleware or create one in `src/middleware/index.ts`:

```typescript
import { createSupabaseServerInstance } from '../db/supabase.client.ts';
import { defineMiddleware } from 'astro:middleware';

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    // Skip auth check for public paths
    if (PUBLIC_PATHS.includes(url.pathname)) {
      return next();
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // IMPORTANT: Always get user session first before any other operations
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      locals.user = {
        email: user.email,
        id: user.id,
      };
    } else if (!PUBLIC_PATHS.includes(url.pathname)) {
      // Redirect to login for protected routes
      return redirect('/auth/login');
    }

    return next();
  },
);
```

#### 3. Create Auth API Endpoints

Create the following endpoints in `src/pages/api/auth/`:

```typescript
// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import { createSupabaseServerInstance } from '../../db/supabase.client.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
  });
};

// src/pages/api/auth/register.ts
export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
  });
};

// src/pages/api/auth/logout.ts
export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(null, { status: 200 });
};
```

#### 4. Protect Routes

In protected Astro pages:

```astro
---
// pages/protected.astro
const { user } = Astro.locals;

if (!user) {
  return Astro.redirect('/auth/login');
}
---

<h1>Protected Page</h1>
<p>Welcome {user.email}!</p>
```

#### 5. Verify SSR Configuration

Verify whether auth pages are rendered server-side, either by `export const prerender = false;` or by `output: "server"` in `astro.config.mjs`.

### Security Best Practices

- Set proper cookie options (httpOnly, secure, sameSite)
- Never expose Supabase integration & keys in client-side components
- Validate all user input server-side
- Use proper error handling and logging

### Common Pitfalls

1. DO NOT use individual cookie methods (get/set/remove)
2. DO NOT import from @supabase/auth-helpers-nextjs
3. DO NOT skip the auth.getUser() call in middleware
4. DO NOT modify cookie handling logic
5. Always handle auth state changes properly

## Database: Create migration

You are a Postgres Expert who loves creating secure database schemas.

This project uses the migrations provided by the Supabase CLI.

### Creating a migration file

Given the context of the user's message, create a database migration file inside the folder `supabase/migrations/`.

The file MUST following this naming convention:

The file MUST be named in the format `YYYYMMDDHHmmss_short_description.sql` with proper casing for months, minutes, and seconds in UTC time:

1. `YYYY` - Four digits for the year (e.g., `2024`).
2. `MM` - Two digits for the month (01 to 12).
3. `DD` - Two digits for the day of the month (01 to 31).
4. `HH` - Two digits for the hour in 24-hour format (00 to 23).
5. `mm` - Two digits for the minute (00 to 59).
6. `ss` - Two digits for the second (00 to 59).
7. Add an appropriate description for the migration.

For example:

```
20240906123045_create_profiles.sql
```

### SQL Guidelines

Write Postgres-compatible SQL code for Supabase migration files that:

- Includes a header comment with metadata about the migration, such as the purpose, affected tables/columns, and any special considerations.
- Includes thorough comments explaining the purpose and expected behavior of each migration step.
- Write all SQL in lowercase.
- Add copious comments for any destructive SQL commands, including truncating, dropping, or column alterations.
- When creating a new table, you MUST enable Row Level Security (RLS) even if the table is intended for public access.
- When creating RLS Policies
  - Ensure the policies cover all relevant access scenarios (e.g. select, insert, update, delete) based on the table's purpose and data sensitivity.
  - If the table  is intended for public access the policy can simply return `true`.
  - RLS Policies should be granular: one policy for `select`, one for `insert` etc) and for each supabase role (`anon` and `authenticated`). DO NOT combine Policies even if the functionality is the same for both roles.
  - Include comments explaining the rationale and intended behavior of each security policy

The generated SQL code should be production-ready, well-documented, and aligned with Supabase's best practices.

## Supabase Astro Initialization

This document provides a reproducible guide to create the necessary file structure for integrating Supabase with your Astro project.

### Prerequisites

- Your project should use Astro 5, TypeScript 5, React 19, and Tailwind 4.
- Install the `@supabase/supabase-js` package.
- Ensure that `/supabase/config.toml` exists
- Ensure that a file `/src/db/database.types.ts` exists and contains the correct type definitions for your database.

IMPORTANT: Check prerequisites before perfoming actions below. If they're not met, stop and ask a user for the fix.

### File Structure and Setup

#### 1. Supabase Client Initialization

Create the file `/src/db/supabase.client.ts` with the following content:

```ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

This file initializes the Supabase client using the environment variables `SUPABASE_URL` and `SUPABASE_KEY`.

#### 2. Middleware Setup

Create the file `/src/middleware/index.ts` with the following content:

```ts
import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

This middleware adds the Supabase client to the Astro context locals, making it available throughout your application.

#### 3. TypeScript Environment Definitions

Create the file `src/env.d.ts` with the following content:

```ts
/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types.ts';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file augments the global types to include the Supabase client on the Astro `App.Locals` object, ensuring proper typing throughout your application.

## Shadcn UI Components

Ten projekt wykorzystuje @shadcn/ui dla komponentów interfejsu użytkownika. Są to pięknie zaprojektowane, dostępne komponenty, które można dostosować do swojej aplikacji.

### Odszukiwanie zainstalowanych komponentów

Komponenty są dostępne w folderze `src/components/ui`, zgodnie z aliasami z pliku `components.json`

### Wykorzystanie komponentu

Zaimportuj komponent zgodnie ze skonfigurowanym aliasem `@/`

```tsx
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
```

Przykładowe wykorzsytanie komponnetów:

```tsx
<Button variant="outline">Click me</Button>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card Content</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter>
</Card>
```

### Instalowanie dodatkowych komponentów

Wiele innych komponentów jest dostępnych, ale nie są one obecnie zainstalowane. Pełną listę można znaleźć na stronie https://ui.shadcn.com/r

Aby zainstalować nowy komponent, wykorzystaj shadcn CLI


```bash
npx shadcn@latest add [component-name]
```

Przykładowo, aby dodać komponent accordion

```bash
npx shadcn@latest add accordion
```

Ważne: `npx shadcn-ui@latest` zostało wycofane, korzystaj z `npx shadcn@latest`

Niektóre popularne komponenty to:

- Accordion
- Alert
- AlertDialog
- AspectRatio
- Avatar
- Calendar
- Checkbox
- Collapsible
- Command
- ContextMenu
- DataTable
- DatePicker
- Dropdown Menu
- Form
- Hover Card
- Menubar
- Navigation Menu
- Popover
- Progress
- Radio Group
- ScrollArea
- Select
- Separator
- Sheet
- Skeleton
- Slider
- Switch
- Table
- Textarea
- Sonner (previously Toast)
- Toggle
- Tooltip

### Component Styling

Ten projekt wykorzystuje wariant stylu „new-york” z kolorem bazowym "neutral" i zmiennymi CSS do tworzenia motywów, zgodnie z konfiguracją w sekcji `components.json`.

## DEVOPS

### Guidelines for CI_CD

#### GITHUB_ACTIONS

- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use terminal command: `git branch -a | cat` to verify whether we use `main` or `master` branch
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup
- Extract common steps into composite actions in separate files

### Version Verification

1. Identify public actions used within the workflow
2. For each action always check what is the most up-to-date version with the following command:
```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name"' |
sed -E 's/.*"v([0-9]+).*/\1/'
```

### Security Best Practices

- **Pin actions to full SHA commits** instead of tags for immutability and security
- **Use principle of least privilege** - grant only necessary permissions to jobs
- **Store secrets securely** - never expose secrets in workflow files
- **Review external actions** - verify source and reputation before using
- **Enable Dependabot** for automatic dependency updates and security monitoring
- **Use composite actions** to reduce duplication and improve maintainability

### Setup Node

Always check the existence of `.nvmrc` in the project to make sure Node up (hardcoded LTS or version from file - if it exists).
