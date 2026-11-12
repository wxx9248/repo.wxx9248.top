import type { AptRepo, PacmanRepo, Repo } from "@/config/repos";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeFetch, jsonResponse } from "@tests/unit/stage/fake-fetch";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import type { Fetch } from "@/lib/stage/github";
import { createHash } from "node:crypto";
import { fakeRun } from "@tests/unit/stage/fake-run";
import { join } from "node:path";
import { stage } from "@/lib/stage/stage";
import { tmpdir } from "node:os";

const now = new Date(Date.UTC(2026, 10, 11, 7, 36, 0));

function api(github: string): string {
  return `https://api.github.com/repos/${github}/releases/latest`;
}

function download(name: string): string {
  return `https://example.test/download/${name}`;
}

/* eslint-disable camelcase */
function release(...names: string[]): Response {
  return jsonResponse({
    assets: names.map((name) => ({
      browser_download_url: download(name),
      digest: `sha256:${createHash("sha256").update(name).digest("hex")}`,
      name,
      size: name.length,
      updated_at: "2026-10-19T05:24:30Z"
    })),
    html_url: "https://example.test/release"
  });
}
/* eslint-enable camelcase */

function assetRoutes(...names: string[]): Record<string, () => Response> {
  return Object.fromEntries(
    names.map((name) => [download(name), () => new Response(name)])
  );
}

const pacman: PacmanRepo = {
  architectures: {
    // eslint-disable-next-line camelcase
    x86_64: [
      { asset: /\.pkg\.tar\.zst$/u, github: "owner/kernel" },
      { asset: /\.pkg\.tar\.zst$/u, github: "owner/extras" }
    ]
  },
  database: "wxx9248",
  description: "",
  install: [],
  kind: "pacman"
};
const apt: AptRepo = {
  component: "main",
  description: "",
  install: [],
  kind: "apt",
  origin: "wxx9248",
  sources: [{ asset: /\.deb$/u, github: "owner/fan" }],
  sourcesFile: "wxx9248.list",
  suite: "trixie"
};

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "stage-test-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

function options(fetch: Fetch, extra: { token?: string } = {}) {
  return { fetch, gid: 1000, now, uid: 1000, ...extra };
}

describe("stage", () => {
  it("puts pacman assets in <repo>/<arch>/ and apt assets in <repo>/pool/<component>/", async () => {
    const { fetch } = fakeFetch({
      [api("owner/kernel")]: () => release("linux-1-x86_64.pkg.tar.zst"),
      [api("owner/extras")]: () => release("extra-1-x86_64.pkg.tar.zst"),
      [api("owner/fan")]: () => release("fan_1_arm64.deb"),
      ...assetRoutes(
        "linux-1-x86_64.pkg.tar.zst",
        "extra-1-x86_64.pkg.tar.zst",
        "fan_1_arm64.deb"
      )
    });
    const { calls, run } = fakeRun();
    const repos: Record<string, Repo> = { archlinux: pacman, debian: apt };

    await stage(root, repos, { ...options(fetch), run });

    expect(await readdir(join(root, "archlinux", "x86_64"))).toEqual([
      "extra-1-x86_64.pkg.tar.zst",
      "linux-1-x86_64.pkg.tar.zst"
    ]);
    expect(await readdir(join(root, "debian", "pool", "main"))).toEqual([
      "fan_1_arm64.deb"
    ]);
    expect(calls.map((call) => call.command)).toEqual([
      "docker",
      "dpkg-scanpackages"
    ]);
    expect(calls[1]?.cwd).toBe(join(root, "debian"));
  });

  it("clears the previous staging tree", async () => {
    await mkdir(join(root, "archlinux"), { recursive: true });
    await writeFile(join(root, "archlinux", "stale.pkg.tar.zst"), "");
    const { fetch } = fakeFetch({
      [api("owner/fan")]: () => release("fan_1_arm64.deb"),
      ...assetRoutes("fan_1_arm64.deb")
    });
    const { run } = fakeRun();

    await stage(root, { debian: apt }, { ...options(fetch), run });

    expect(await readdir(root)).toEqual(["debian"]);
  });

  it("throws naming a file that two sources put in the same folder", async () => {
    const { fetch, requests } = fakeFetch({
      [api("owner/kernel")]: () => release("same-1-x86_64.pkg.tar.zst"),
      [api("owner/extras")]: () => release("same-1-x86_64.pkg.tar.zst"),
      ...assetRoutes("same-1-x86_64.pkg.tar.zst")
    });
    const { run } = fakeRun();

    await expect(
      stage(root, { archlinux: pacman }, { ...options(fetch), run })
    ).rejects.toThrow("same-1-x86_64.pkg.tar.zst");
    expect(requests.map((request) => request.url)).not.toContain(
      download("same-1-x86_64.pkg.tar.zst")
    );
  });

  it("passes the token to the API", async () => {
    const { fetch, requests } = fakeFetch({
      [api("owner/fan")]: () => release("fan_1_arm64.deb"),
      ...assetRoutes("fan_1_arm64.deb")
    });
    const { run } = fakeRun();

    await stage(
      root,
      { debian: apt },
      { ...options(fetch, { token: "secret" }), run }
    );

    const call = requests.find((request) => request.url === api("owner/fan"));
    expect(call?.headers.get("Authorization")).toBe("Bearer secret");
  });

  it("reports each downloaded file", async () => {
    const { fetch } = fakeFetch({
      [api("owner/fan")]: () => release("fan_1_arm64.deb"),
      ...assetRoutes("fan_1_arm64.deb")
    });
    const { run } = fakeRun();
    const lines: string[] = [];

    await stage(
      root,
      { debian: apt },
      { ...options(fetch), log: (line) => lines.push(line), run }
    );

    expect(lines).toEqual([
      join(root, "debian", "pool", "main", "fan_1_arm64.deb")
    ]);
  });
});
