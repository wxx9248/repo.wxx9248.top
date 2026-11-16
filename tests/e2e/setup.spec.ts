import { blockExternal, expect } from "./helpers";
import { findRepository } from "@/config/repos";
import { site } from "@/config/site";
import { test } from "@playwright/test";

test("setup panel on /archlinux/ and /debian/ only", async ({ page }) => {
  await blockExternal(page);
  for (const path of ["/archlinux/", "/debian/"]) {
    await page.goto(path);
    await expect(page.getByRole("region", { name: "setup" })).toBeVisible();
  }
  for (const path of ["/", "/archlinux/x86_64/", "/debian/pool/"]) {
    await page.goto(path);
    await expect(page.getByRole("region", { name: "setup" })).toHaveCount(0);
  }
});

test("copy puts the snippet on the clipboard and says so", async ({
  context,
  page
}, { project }) => {
  test.skip(
    !project.name.startsWith("desktop"),
    "Clipboard permissions are granted on desktop only"
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await blockExternal(page);
  await page.goto("/archlinux/");
  const [pacmanConf] =
    findRepository("archlinux")?.setup(site.url).blocks ?? [];
  await page.locator("button[data-copy]").first().click();
  await expect(page.locator("[data-message]")).toContainText("copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    pacmanConf?.code
  );
});

test("each copy button is named after its command", async ({ page }) => {
  await blockExternal(page);
  await page.goto("/archlinux/");
  await expect(
    page.getByRole("button", { name: "Copy: [wxx9248]" })
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Copy: sudo pacman -Syu linux" })
  ).toHaveCount(1);
  await page.goto("/debian/");
  await expect(
    page.getByRole("button", {
      name: "Copy: echo 'deb [trusted=yes]"
    })
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Copy: sudo apt update && sudo apt install"
    })
  ).toHaveCount(1);
});
