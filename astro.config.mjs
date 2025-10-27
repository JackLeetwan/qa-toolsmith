// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";

// Determine which adapter to use based on environment
/* eslint-disable no-undef */
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
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: useCloudflareAdapter
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : undefined,
    },
    // Note: We only define ENV_NAME here as it's needed for client-side feature flags
    // SUPABASE_URL and SUPABASE_KEY are accessed via process.env fallback in runtime
    // (vite.define hardcodes values at build time, making runtime env vars unavailable)
    define: {
      "import.meta.env.ENV_NAME": JSON.stringify(process.env.ENV_NAME),
    },
  },
  adapter: useCloudflareAdapter ? cloudflare() : node({ mode: "standalone" }),
});
/* eslint-enable no-undef */
