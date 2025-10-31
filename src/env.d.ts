/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string;
        role: "admin" | "user";
      };
    }
  }
}

interface ImportMetaEnv {
  // Only keep env vars that are NOT in astro.config.mjs env.schema
  // Variables in schema (SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY, ENV_NAME, etc.) should be
  // accessed via astro:env/server or astro:env/client

  // Vitest environment variable
  readonly VITEST?: string;

  // OpenRouter optional configuration variables (with defaults in code)
  // These are intentionally NOT in astro:env schema as they have sensible defaults
  // and are meant to be optional overrides for advanced configuration
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_DEFAULT_MODEL?: string;
  readonly OPENROUTER_MAX_RETRIES?: string;
  readonly OPENROUTER_TIMEOUT?: string;
  readonly OPENROUTER_RATE_LIMIT?: string;
  readonly OPENROUTER_BURST_LIMIT?: string;
  readonly OPENROUTER_DAILY_LIMIT?: string;
  readonly OPENROUTER_RESET_HOUR?: string;
  readonly OPENROUTER_MAX_TOKENS?: string;
  readonly OPENROUTER_SYSTEM_PROMPT?: string;
  readonly OPENROUTER_STRUCTURED_OUTPUT?: string;
}

// Declare the ImportMeta interface to extend the global type system
// This extends the built-in ImportMeta type from Astro/Vite
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
