import { defineConfig } from "astro/config";
import { project } from "@/config/project";
import { site } from "@/config/site";

export default defineConfig({
  compressHTML: true,
  outDir: project.distDir,
  site: site.url,
  trailingSlash: "always",
  vite: {
    css: {
      lightningcss: { drafts: { customMedia: true } },
      transformer: "lightningcss"
    }
  }
});
