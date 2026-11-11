import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import type { ReleaseAsset } from "@/lib/stage/github";
import { createHash } from "node:crypto";
import { downloadAsset } from "@/lib/stage/download";
import { fakeFetch } from "@tests/unit/stage/fake-fetch";
import { join } from "node:path";
import { tmpdir } from "node:os";

const body = "pretend this is a .deb package";
const bodyDigest = `sha256:${createHash("sha256").update(body).digest("hex")}`;
const assetUrl = "https://example.test/download/pkg_1.0.0_arm64.deb";

function makeAsset(overrides: Partial<ReleaseAsset> = {}): ReleaseAsset {
  return {
    digest: bodyDigest,
    name: "pkg_1.0.0_arm64.deb",
    size: body.length,
    updatedAt: "2026-10-19T05:24:30Z",
    url: assetUrl,
    ...overrides
  };
}

let directory = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "download-test-"));
});

afterEach(async () => {
  await rm(directory, { force: true, recursive: true });
});

describe("downloadAsset", () => {
  it("writes the file, checks the digest, and sets mtime to updatedAt", async () => {
    const { fetch } = fakeFetch({ [assetUrl]: () => new Response(body) });

    const path = await downloadAsset(makeAsset(), directory, { fetch });

    expect(path).toBe(join(directory, "pkg_1.0.0_arm64.deb"));
    expect(await readFile(path, "utf8")).toBe(body);
    expect((await stat(path)).mtime.toISOString()).toBe(
      "2026-10-19T05:24:30.000Z"
    );
    expect(await readdir(directory)).toEqual(["pkg_1.0.0_arm64.deb"]);
  });

  it("throws on a digest mismatch and leaves no file and no .part", async () => {
    const { fetch } = fakeFetch({
      [assetUrl]: () => new Response("tampered contents")
    });

    const failure = downloadAsset(makeAsset(), directory, { fetch });

    await expect(failure).rejects.toThrow("pkg_1.0.0_arm64.deb");
    await expect(failure).rejects.toThrow("Digest mismatch");
    expect(await readdir(directory)).toEqual([]);
  });

  it("throws on a missing digest without downloading", async () => {
    const { fetch, requests } = fakeFetch({
      [assetUrl]: () => new Response(body)
    });

    const failure = downloadAsset(makeAsset({ digest: null }), directory, {
      fetch
    });

    await expect(failure).rejects.toThrow("no digest");
    expect(requests).toEqual([]);
    expect(await readdir(directory)).toEqual([]);
  });

  it("throws on a failed HTTP download and leaves nothing", async () => {
    const { fetch } = fakeFetch({
      [assetUrl]: () => new Response("gone", { status: 500 })
    });

    const failure = downloadAsset(makeAsset(), directory, { fetch });

    await expect(failure).rejects.toThrow("500");
    expect(await readdir(directory)).toEqual([]);
  });

  it("throws when the body is cut short and leaves nothing", async () => {
    const encoder = new TextEncoder();
    const { fetch } = fakeFetch({
      [assetUrl]: () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.enqueue(encoder.encode(body.slice(0, 5)));
              controller.error(new Error("connection reset"));
            }
          })
        )
    });

    const failure = downloadAsset(makeAsset(), directory, { fetch });

    await expect(failure).rejects.toThrow("connection reset");
    expect(await readdir(directory)).toEqual([]);
  });
});
