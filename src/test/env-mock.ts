// Environment variable mocks for tests
// This file must be imported before any module that uses import.meta.env

Object.defineProperty(import.meta, "env", {
  value: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_KEY: "test-service-key",
  },
  writable: false,
  configurable: true,
});
