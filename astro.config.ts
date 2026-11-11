import { defineConfig } from "astro/config";

export default defineConfig({
  compressHTML: true,
  site: "https://repo.wxx9248.top",
  trailingSlash: "always",
  vite: {
    css: {
      lightningcss: { drafts: { customMedia: true } },
      transformer: "lightningcss"
    }
  }
});
