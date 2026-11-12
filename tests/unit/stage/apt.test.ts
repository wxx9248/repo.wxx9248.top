import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { debArchitecture, indexApt, releaseFile } from "@/lib/stage/apt";
import { fakeRun, missingCommand } from "@tests/unit/stage/fake-run";
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { AptRepo } from "@/config/repos";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repo: AptRepo = {
  component: "main",
  description: "",
  install: [],
  kind: "apt",
  origin: "wxx9248",
  sources: [],
  sourcesFile: "wxx9248.list",
  suite: "trixie"
};
const now = new Date(Date.UTC(2026, 10, 11, 7, 36, 0));
const packages = "Package: fan-controllerd\nVersion: 1.0.0\n\n";

function sha256(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("debArchitecture", () => {
  it("reads the architecture from the file name", () => {
    expect(debArchitecture("fan-controllerd_1.0.0_arm64.deb")).toBe("arm64");
    expect(debArchitecture("x_1_all.deb")).toBe("all");
  });
});

describe("releaseFile", () => {
  it("lists the files sorted, with a trailing newline", () => {
    const release = releaseFile(repo, ["arm64"], now, [
      { path: "main/binary-arm64/Packages.gz", sha256: "bb", size: 20 },
      { path: "main/binary-arm64/Packages", sha256: "aa", size: 10 }
    ]);

    expect(release).toBe(
      [
        "Origin: wxx9248",
        "Label: wxx9248",
        "Suite: trixie",
        "Codename: trixie",
        "Date: Wed, 11 Nov 2026 07:36:00 UTC",
        "Architectures: arm64",
        "Components: main",
        "SHA256:",
        " aa 10 main/binary-arm64/Packages",
        " bb 20 main/binary-arm64/Packages.gz",
        ""
      ].join("\n")
    );
  });
});

describe("indexApt", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "apt-test-"));
    await mkdir(join(root, "pool", "main"), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  async function stageDebs(...names: string[]): Promise<void> {
    for (const name of names) {
      await writeFile(join(root, "pool", "main", name), "");
    }
  }

  it("runs dpkg-scanpackages in the repo root and writes Packages, Packages.gz and Release", async () => {
    await stageDebs("fan-controllerd_1.0.0_arm64.deb");
    const { calls, run } = fakeRun({ "dpkg-scanpackages": packages });

    await indexApt(root, repo, { now, run });

    expect(calls).toEqual([
      {
        args: ["--arch", "arm64", "pool"],
        command: "dpkg-scanpackages",
        cwd: root
      }
    ]);
    const directory = join(root, "dists", "trixie", "main", "binary-arm64");
    expect(await readFile(join(directory, "Packages"), "utf8")).toBe(packages);
    const gz = await readFile(join(directory, "Packages.gz"));
    expect(gunzipSync(gz).toString()).toBe(packages);
    const release = await readFile(
      join(root, "dists", "trixie", "Release"),
      "utf8"
    );
    expect(release).toBe(
      releaseFile(repo, ["arm64"], now, [
        {
          path: "main/binary-arm64/Packages",
          sha256: sha256(packages),
          size: packages.length
        },
        {
          path: "main/binary-arm64/Packages.gz",
          sha256: sha256(gz),
          size: gz.length
        }
      ])
    );
  });

  it("writes a Packages.gz that does not depend on when it was made", async () => {
    await stageDebs("fan-controllerd_1.0.0_arm64.deb");
    const { run } = fakeRun({ "dpkg-scanpackages": packages });
    const path = join(
      root,
      "dists",
      "trixie",
      "main",
      "binary-arm64",
      "Packages.gz"
    );

    await indexApt(root, repo, { now, run });
    const first = await readFile(path);
    await new Promise((done) => setTimeout(done, 1100));
    await indexApt(root, repo, { now, run });

    expect(await readFile(path)).toEqual(first);
    expect(first).toEqual(gzipSync(packages, { level: 9 }));
  });

  it("does not list architecture all on its own", async () => {
    await stageDebs("x_1_all.deb", "y_1_arm64.deb");
    const { calls, run } = fakeRun({ "dpkg-scanpackages": packages });

    await indexApt(root, repo, { now, run });

    expect(calls.map((call) => call.args)).toEqual([
      ["--arch", "arm64", "pool"]
    ]);
    const release = await readFile(
      join(root, "dists", "trixie", "Release"),
      "utf8"
    );
    expect(release).toContain("Architectures: arm64\n");
    expect(release).not.toContain("binary-all");
  });

  it("throws when no architecture-specific package was staged", async () => {
    await stageDebs("x_1_all.deb");
    const { calls, run } = fakeRun();

    await expect(indexApt(root, repo, { now, run })).rejects.toThrow(
      "architecture-specific"
    );
    expect(calls).toEqual([]);
  });

  it("says to install dpkg-dev when dpkg-scanpackages is missing", async () => {
    await stageDebs("y_1_arm64.deb");
    const { run } = fakeRun({
      "dpkg-scanpackages": missingCommand("dpkg-scanpackages")
    });

    await expect(indexApt(root, repo, { now, run })).rejects.toThrow(
      "dpkg-dev"
    );
  });
});
