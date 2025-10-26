// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://qa-toolsmith.example.com", // TODO: Update with production URL
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Ensure ENV_NAME is available in test mode
      "import.meta.env.ENV_NAME": JSON.stringify(
        process.env.ENV_NAME || "local",
      ),
    },
  },
  adapter: node({
    mode: "standalone",
  }),
});
