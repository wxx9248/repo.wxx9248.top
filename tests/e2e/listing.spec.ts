import { type Page, test } from "@playwright/test";
import { blockExternal, expect } from "./helpers";

const folderPath = "/archlinux/x86_64/";
const entryCount = 7;

const visibleRows = (page: Page) =>
  page.locator("[data-listing] tr[data-entry]:not([hidden])");

const rowNames = (page: Page): Promise<string[]> =>
  page
    .locator("[data-listing] tr[data-entry]")
    .evaluateAll((rows) =>
      rows.map((row) => (row as HTMLElement).dataset.name ?? "")
    );

const rowSizes = async (page: Page): Promise<number[]> => {
  const sizes = await page
    .locator("[data-listing] tr[data-entry]")
    .evaluateAll((rows) =>
      rows.map((row) => (row as HTMLElement).dataset.size ?? "")
    );
  return sizes.map(Number);
};

const sortButton = (page: Page, key: string) =>
  page.locator(`th[data-sort-key="${key}"] button`);

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

test("typing filters rows case-insensitively and shows n of m", async ({
  page
}) => {
  await page.goto(folderPath);
  await page.locator("input[data-filter]").fill("HEADERS");
  await expect(visibleRows(page)).toHaveCount(1);
  await expect(visibleRows(page)).toContainText("linux-headers");
  await expect(page.locator("[data-summary]")).toHaveText(`1 of ${entryCount}`);
});

test("regex characters match literally", async ({ page }) => {
  await page.goto(folderPath);
  await page.locator("input[data-filter]").fill("1:2.0+");
  await expect(visibleRows(page)).toHaveCount(1);
  await expect(visibleRows(page)).toContainText("foo-1:2.0+r1");
});

test("no matches shows the no-matches row", async ({ page }) => {
  await page.goto(folderPath);
  const noMatch = page.locator("tr[data-no-match]");
  await expect(noMatch).toBeHidden();
  await page.locator("input[data-filter]").fill("zzz-nothing");
  await expect(visibleRows(page)).toHaveCount(0);
  await expect(noMatch).toBeVisible();
  await expect(page.locator("[data-summary]")).toHaveText(`0 of ${entryCount}`);
});

test("Esc clears the filter and restores the summary", async ({ page }) => {
  await page.goto(folderPath);
  const summary = page.locator("[data-summary]");
  const original = await summary.textContent();
  const input = page.locator("input[data-filter]");
  await input.fill("HEADERS");
  await expect(summary).toHaveText(`1 of ${entryCount}`);
  await input.press("Escape");
  await expect(input).toHaveValue("");
  await expect(visibleRows(page)).toHaveCount(entryCount);
  await expect(page.locator("tr[data-no-match]")).toBeHidden();
  await expect(summary).toHaveText(original ?? "");
});

test("/ focuses the filter", async ({ page }) => {
  await page.goto(folderPath);
  const input = page.locator("input[data-filter]");
  await page.locator("body").press("/");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  // While typing in the box, / is an ordinary character
  await page.keyboard.type("a/b");
  await expect(input).toHaveValue("a/b");
});

test("clicking Size sorts descending then ascending, setting aria-sort, and ../ stays first", async ({
  page
}) => {
  await page.goto(folderPath);
  const sizeHeader = page.locator('th[data-sort-key="size"]');
  const nameHeader = page.locator('th[data-sort-key="name"]');
  const firstRow = page.locator("[data-listing] tbody tr").first();

  await sortButton(page, "size").click();
  await expect(sizeHeader).toHaveAttribute("aria-sort", "descending");
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");
  await expect(page.locator('th[data-sort-key="mtime"]')).toHaveAttribute(
    "aria-sort",
    "none"
  );
  const descending = await rowSizes(page);
  expect(descending).toEqual([...descending].sort((a, b) => b - a));
  expect(new Set(descending).size).toBeGreaterThan(1);
  await expect(firstRow).toHaveAttribute("data-parent", "");

  await sortButton(page, "size").click();
  await expect(sizeHeader).toHaveAttribute("aria-sort", "ascending");
  const ascending = await rowSizes(page);
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
  await expect(firstRow).toHaveAttribute("data-parent", "");
});

test("clicking Name when it is already active sorts descending", async ({
  page
}) => {
  await page.goto(folderPath);
  const nameHeader = page.locator('th[data-sort-key="name"]');
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  const ascending = await rowNames(page);
  expect(ascending).toEqual([...ascending].sort());

  await sortButton(page, "name").click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  expect(await rowNames(page)).toEqual([...ascending].reverse());

  await sortButton(page, "name").click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  expect(await rowNames(page)).toEqual(ascending);
});

test("clicking Modified sorts newest first", async ({ page }) => {
  await page.goto(folderPath);
  await sortButton(page, "mtime").click();
  await expect(page.locator('th[data-sort-key="mtime"]')).toHaveAttribute(
    "aria-sort",
    "descending"
  );
  await expect(page.locator('th[data-sort-key="name"]')).toHaveAttribute(
    "aria-sort",
    "none"
  );
});

test("sorting keeps the active filter applied", async ({ page }) => {
  await page.goto(folderPath);
  await page.locator("input[data-filter]").fill("linux");
  await expect(visibleRows(page)).toHaveCount(2);
  await sortButton(page, "size").click();
  await expect(visibleRows(page)).toHaveCount(2);
});

test("folders stay above files when sorting by size", async ({ page }) => {
  await page.goto("/debian/");
  for (let click = 0; click < 2; click += 1) {
    await sortButton(page, "size").click();
    const names = await rowNames(page);
    expect(names.slice(0, 2).sort()).toEqual(["dists", "pool"]);
  }
});

test("the root listing has no sortable Description column", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.locator("th button")).toHaveCount(2);
  await expect(page.locator("th", { hasText: "Description" })).toHaveCount(1);
  await expect(
    page.locator("th", { hasText: "Description" }).locator("button")
  ).toHaveCount(0);
});
