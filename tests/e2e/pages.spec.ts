import { type Page, test } from "@playwright/test";
import { blockExternal, expect } from "./helpers";
import { repos } from "@/config/repos";

const listingLinks = (page: Page): Promise<string[]> =>
  page
    .locator("[data-listing] a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).href)
    );

test("every link on every listing page returns 200", async ({
  baseURL,
  page,
  request
}) => {
  await blockExternal(page);
  const pending = [new URL("/", baseURL).href];
  const seen = new Set<string>();
  const files = new Set<string>();
  while (pending.length > 0) {
    const url = pending.pop() ?? "";
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    const response = await page.goto(url);
    expect(response?.status(), url).toBe(200);
    for (const href of await listingLinks(page)) {
      if (href.endsWith("/")) {
        pending.push(href);
      } else {
        files.add(href);
      }
    }
  }
  expect(seen.size).toBeGreaterThan(1);
  const paths = [...files].map((href) =>
    decodeURIComponent(new URL(href).pathname)
  );
  expect(paths).toContain(
    "/archlinux/x86_64/foo-1:2.0+r1-1-x86_64.pkg.tar.zst"
  );
  expect(paths).toContain("/misc/ü notes.txt");
  /*
   * Astro's preview server answers 404 for extensionless files (Release,
   * Packages) while trailingSlash is "always", and it only decodes the
   * percent-escapes encodeURI produces (not %3A or %2B). GitHub Pages decodes
   * both, so fetch the same paths in the form the preview server accepts.
   * The fixture archives are not real gzip, yet the preview server labels them
   * Content-Encoding: gzip, so a HEAD request stands in for the download.
   */
  const hasExtension = /\.[^/]+$/u;
  for (const path of paths.filter((file) => hasExtension.test(file))) {
    const response = await request.head(new URL(encodeURI(path), baseURL).href);
    expect(response.status(), path).toBe(200);
  }
});

test("the prompt path links to each ancestor", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/archlinux/x86_64/");
  const hrefs = await page
    .getByRole("navigation", { name: "Path" })
    .getByRole("link")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href"))
    );
  expect(hrefs).toEqual(["/", "/archlinux/", "/archlinux/x86_64/"]);
});

test("../ goes up one level", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/archlinux/x86_64/");
  await page.getByRole("link", { name: "../" }).click();
  await expect(page).toHaveURL("/archlinux/");
});

test("intro only at /", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "repo.wxx9248.top"
  );
  await expect(
    page.getByText("Package repositories for things wxx9248 builds.")
  ).toBeVisible();
  await page.goto("/archlinux/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "/archlinux/"
  );
  await expect(
    page.getByText("Package repositories for things wxx9248 builds.")
  ).toHaveCount(0);
});

test("root shows each repo's description", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/");
  await expect(page.locator("[data-listing] thead th").nth(1)).toHaveText(
    "Description"
  );
  for (const [name, repo] of Object.entries(repos)) {
    const row = page.locator(`[data-entry][data-name="${name}"]`);
    await expect(row).toContainText(repo.description);
  }
});

test("symlinks show their target", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/archlinux/x86_64/");
  const row = page.locator('[data-entry][data-name="wxx9248.db"]');
  await expect(row).toHaveAttribute("data-kind", "symlink");
  await expect(row).toContainText("→ wxx9248.db.tar.gz");
});

test("folders sort first and the parent row leads", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/debian/");
  const kinds = await page
    .locator("[data-listing] tbody tr:not([hidden])")
    .evaluateAll((rows) =>
      rows.map((row) =>
        row.hasAttribute("data-parent")
          ? "parent"
          : (row as HTMLElement).dataset.kind
      )
    );
  expect(kinds).toEqual(["parent", "folder", "folder"]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders fully without JavaScript", async ({ page }) => {
    await blockExternal(page);
    await page.goto("/archlinux/");
    await expect(page.locator("[data-listing] tr[data-entry]")).toHaveCount(1);
    await expect(page.locator("[data-filter]")).toBeHidden();
    await expect(page.locator("button[data-copy]").first()).toBeHidden();
    await expect(page.locator("pre").first()).toBeVisible();

    await page.goto("/archlinux/x86_64/");
    await expect(page.locator("[data-listing] tr[data-entry]")).toHaveCount(7);
  });
});

for (const path of ["/", "/archlinux/", "/archlinux/x86_64/"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await blockExternal(page);
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
