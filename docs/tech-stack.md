# Tech Stack & Deployment

## Overview

QA Toolsmith is built with modern web technologies focused on performance, developer experience, and maintainability. The application uses Astro 5 for SSR (Server-Side Rendering) to handle both static content and server-side API routes.

## Technology Stack

### Frontend
- **Astro 5** (v5.13.7) - Static Site Generator with SSR support via `@astrojs/cloudflare` adapter
  - API endpoints using `context` parameter for request handling
  - Middleware support with `onRequest` export
  - Cloudflare Workers integration via `context.locals.runtime`
- **React 19** (v19.1.1) - Component library for interactive UI elements
  - React Compiler support enabled
  - New hooks: `use()` for async data fetching, `useOptimistic()` for optimistic UI updates
  - Enhanced Suspense for better loading states
- **TypeScript 5** - Type-safe JavaScript with strict mode enabled
- **Tailwind CSS 4** (v4.1.13) - Utility-first CSS framework
  - CSS-first configuration using `@import "tailwindcss"` and `@theme` directive
  - Native Vite integration via `@tailwindcss/vite` plugin (no PostCSS required)
  - Direct CSS variables for theme tokens (e.g., `--color-primary`, `--spacing-4`)
- **Shadcn/ui** - Accessible UI components built on Radix UI

### Backend & Database
- **Supabase** - Backend-as-a-Service with SSR support via `@supabase/ssr` (v0.7.0)
  - PostgreSQL database with Row Level Security (RLS)
  - Built-in JWT authentication
  - Real-time subscriptions (future feature)
  - SQL migrations with Supabase CLI

### AI Integration
- **Openrouter.ai** - Multi-provider AI API (supports OpenAI, Anthropic, Google, etc.)
- Environment-based configuration with per-user daily limits
- Structured JSON responses with schema validation

### Testing
- **Vitest** (v3.2.4) - Fast unit testing framework with Vite-native performance
- **Playwright** (v1.56.1) - Multi-browser E2E testing with Chromium support
- **React Testing Library** (v16.3.0) - Component testing utilities
- **@testing-library/user-event** (v14.6.1) - Realistic user interaction simulation

### Development Tools
- **ESLint** (v9.38.0) - Code linting with TypeScript, Astro, and React support
- **Prettier** - Code formatting with Astro plugin
- **Husky** (v9.1.7) - Git hooks for quality gates
- **lint-staged** (v15.5.0) - Pre-commit linting and formatting

## Deployment & Hosting

QA Toolsmith is deployed on **Cloudflare Pages** using the official `@astrojs/cloudflare` adapter (v12.6.10). This provides optimal integration with Cloudflare Workers for server-side rendering support.

**Key Configuration:**
- **Adapter**: `@astrojs/cloudflare` v12.6.10 for Cloudflare Workers integration with Astro 5
- **Build Command**: `npm run build` with `ASTRO_TARGET=cloudflare`
- **Build Output**: `dist/` directory with Cloudflare Workers-compatible bundles
- **Environment Variables**: Type-safe access via `astro:env/server` and `astro:env/client`
  - Supabase credentials (`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`)
  - Feature flags (`ENV_NAME`)
  - AI integration (`OPENROUTER_API_KEY`)
  - Cloudflare bindings available at `context.locals.runtime.env`
- **Preview Deployments**: Automatic for all pull requests with preview URLs
- **SSR**: Enabled via `output: "server"` in `astro.config.mjs`

The application requires SSR due to server-side API endpoints (authentication, data generators, health checks), making Cloudflare Pages the ideal choice for its excellent SSR support and generous free tier.

### Docker Deployment (Alternative)

QA Toolsmith can also be deployed as a Docker container for flexibility across various hosting platforms (DigitalOcean, AWS, Azure, etc.).

**Key Features:**
- **Multi-stage build**: Optimized image size (~200MB)
- **Non-root user**: Enhanced security with `nodejs:1001` user
- **Health checks**: Built-in endpoint monitoring at `/api/health`
- **Flexible configuration**: Runtime environment variables for all secrets
- **GitHub Container Registry**: Ready for `ghcr.io` deployment

**Quick Start:**
```bash
docker build -t jayleetwan/qa-toolsmith:latest .
docker run -d -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_KEY=your-anon-key \
  jayleetwan/qa-toolsmith:latest
```

For detailed Docker deployment instructions, see [Docker Deployment Guide](./docker.md).

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server
npm run dev:e2e       # Start with E2E test environment
```

### Production Build
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **CI Workflow** (`.github/workflows/ci.yml`): Lint → Build → Unit Tests → E2E Tests
- **Deployment Workflow** (`.github/workflows/deploy-cloudflare.yml`): Automatic on master branch merges to Cloudflare Pages
- **See**: [Cloudflare Pages Deployment Guide](./deployment-cloudflare.md) for full CI/CD details
- DigitalOcean App Platform jako hosting aplikacji Astro
