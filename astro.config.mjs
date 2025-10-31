// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";

// Determine which adapter to use based on environment
const useCloudflareAdapter =
  process.env.CF_PAGES === "1" || process.env.ASTRO_TARGET === "cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://qa-toolsmith.pages.dev", // Cloudflare Pages URL
  output: "server",
  server: {
    port: 3000,
    host: true,
  },
  integrations: [
    react({
      experimentalReactChildren: true,
    }),
    sitemap(),
  ],
  env: {
    schema: {
      // Supabase configuration (server-side only)
      SUPABASE_URL: envField.string({
        context: "server",
        access: "public",
        optional: false,
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
      SUPABASE_SERVICE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),

      // Feature flags environment (client-accessible)
      ENV_NAME: envField.enum({
        context: "client",
        access: "public",
        values: ["local", "integration", "production"],
        optional: false,
        default: "local",
      }),

      // AI integration (server-side only, optional)
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),

      // Auth configuration (server-side only)
      AUTH_RESET_REDIRECT_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      AUTH_SIGNUP_REDIRECT_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
    },
    // Enable secret validation for security
    validateSecrets: true,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      port: 3000,
      strictPort: true,
    },
    resolve: {
      alias: useCloudflareAdapter
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
  },
  adapter: useCloudflareAdapter ? cloudflare() : node({ mode: "standalone" }),
  security: {
    checkOrigin: true,
  },
});
