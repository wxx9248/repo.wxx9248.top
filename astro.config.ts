import { defineConfig } from "astro/config";
import { site } from "@/config/site";

export default defineConfig({
  compressHTML: true,
  site: site.url,
  trailingSlash: "always",
  vite: {
    css: {
      lightningcss: { drafts: { customMedia: true } },
      transformer: "lightningcss"
    }
  }
});
