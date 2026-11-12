import { blockExternal, expect } from "./helpers";
import { test } from "@playwright/test";

test("an unknown path returns 404 with the 404 page", async ({ page }) => {
  await blockExternal(page);
  const response = await page.goto("/no/such%20place/");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("No such file or directory");
  await expect(page.locator(".prompt-line")).toContainText(
    "$ cd /no/such place/"
  );
  await expect(page.getByRole("link", { name: "go to /" })).toHaveAttribute(
    "href",
    "/"
  );
});
