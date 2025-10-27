/// <reference types="astro/client" />

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
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_KEY: string;
  readonly OPENROUTER_API_KEY?: string;
  readonly ENV_NAME?: string;
  readonly VITEST?: string;
}

// Declare the ImportMeta interface to extend the global type system
// This extends the built-in ImportMeta type from Astro/Vite
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
