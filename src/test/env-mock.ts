// Environment variable mocks for tests
// This file mocks both import.meta.env and astro:env/* modules

Object.defineProperty(import.meta, "env", {
  value: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_KEY: "test-service-key",
    VITEST: "1",
  },
  writable: false,
  configurable: true,
});

// Export astro:env/* variables
export const SUPABASE_URL = "https://test.supabase.co";
export const SUPABASE_KEY = "test-anon-key";
export const SUPABASE_SERVICE_KEY = "test-service-key";
export const OPENROUTER_API_KEY = "test-openrouter-key";
// Note: AUTH_RESET_REDIRECT_URL should be undefined by default for tests
// Individual tests can override this by mocking the import
export const AUTH_RESET_REDIRECT_URL = undefined;
export const ENV_NAME = "local" as "local" | "integration" | "production";
