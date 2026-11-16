import { blockExternal, expect } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
import { test } from "@playwright/test";

for (const path of ["/", "/archlinux/", "/archlinux/x86_64/", "/missing/"]) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await blockExternal(page);
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target }) => target.join(" "))
      }))
    ).toEqual([]);
  });
}
