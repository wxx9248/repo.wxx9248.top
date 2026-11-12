import { type Page, expect } from "@playwright/test";

export { expect };

function isLocal({ hostname }: URL): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Aborts every request that isn't served by the local server. Must be called
 * before navigating. Fonts are self-hosted, so nothing legitimate is external.
 */
export async function blockExternal(page: Page): Promise<void> {
  await page.route(
    (url) => !isLocal(url),
    async (route) => {
      await route.abort();
    }
  );
}
