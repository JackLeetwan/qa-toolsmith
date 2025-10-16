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
  },
  adapter: node({
    mode: "standalone",
  }),
});
