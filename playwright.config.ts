import { defineConfig } from "@playwright/test";
import { project } from "@/config/project";

// Off Astro's default 4321, so a dev server running there is never reused
const port = 4323;

const viewports = {
  desktop: { height: 800, width: 1280 },
  phone: { height: 844, width: 390 }
};
const colorSchemes = ["light", "dark"] as const;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  projects: Object.entries(viewports).flatMap(([name, viewport]) =>
    colorSchemes.map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { colorScheme, viewport }
    }))
  ),
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "tests/e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    // The flag keeps the server in the foreground even under an agent
    command: `pnpm exec astro build && pnpm exec tsx scripts/assemble.ts && pnpm exec astro preview --ignore-lock --port ${port}`,
    env: { [project.repoDirVariable]: project.fixtureDir },
    port,
    reuseExistingServer: !process.env.CI
  }
});
