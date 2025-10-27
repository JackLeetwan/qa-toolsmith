// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://qa-toolsmith.pages.dev", // Cloudflare Pages URL
  output: "server",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Inject environment variables at build time
      // These are available during build from Cloudflare Pages environment
      "import.meta.env.ENV_NAME": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.ENV_NAME || null,
      ),
      "import.meta.env.PUBLIC_ENV_NAME": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.ENV_NAME || null,
      ),
      "import.meta.env.SUPABASE_URL": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.SUPABASE_URL || null,
      ),
      "import.meta.env.SUPABASE_KEY": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.SUPABASE_KEY || null,
      ),
      "import.meta.env.SUPABASE_SERVICE_KEY": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.SUPABASE_SERVICE_KEY || null,
      ),
      "import.meta.env.OPENROUTER_API_KEY": JSON.stringify(
        // eslint-disable-next-line no-undef
        process.env.OPENROUTER_API_KEY || null,
      ),
    },
  },
  adapter: cloudflare({
    mode: 'directory'
  }),
});
