import { defineConfig } from "@playwright/test";

// Set E2E_PORT when something else (such as another dev server) holds 4321
const port = Number(process.env.E2E_PORT ?? "4321");

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
    env: { REPO_DIR: "tests/fixtures/repo" },
    port,
    reuseExistingServer: !process.env.CI
  }
});
