# Tech Stack & Deployment

## Overview

QA Toolsmith is built with modern web technologies focused on performance, developer experience, and maintainability. The application uses Astro 5 for SSR (Server-Side Rendering) to handle both static content and server-side API routes.

## Technology Stack

### Frontend
- **Astro 5** - Static Site Generator with SSR support
- **React 19** - Component library for interactive UI elements
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/ui** - Accessible UI components

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Built-in authentication
  - Real-time subscriptions
  - Row Level Security (RLS)

### AI Integration
- **Openrouter.ai** - Multi-provider AI API (supports OpenAI, Anthropic, Google, etc.)

### Testing
- **Vitest** - Unit testing framework
- **Playwright** - End-to-End testing
- **React Testing Library** - Component testing utilities

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

## Deployment & Hosting

QA Toolsmith is deployed on **Cloudflare Pages** using the official `@astrojs/cloudflare` adapter. This provides optimal integration with Cloudflare Workers for server-side rendering support.

**Key Configuration:**
- **Adapter**: `@astrojs/cloudflare` for Cloudflare Workers integration
- **Build Command**: `npm run build`
- **Build Output**: `dist/` directory
- **Environment Variables**: Supabase credentials and application secrets
- **Preview Deployments**: Automatic for all pull requests

The application requires SSR due to server-side API endpoints, making Cloudflare Pages the ideal choice for its excellent SSR support and generous free tier.

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
- **Testing Stages**: Lint → Build → Unit Tests → E2E Tests → Health Check
- **Deployment**: Automatic on main branch merges to Cloudflare Pages

