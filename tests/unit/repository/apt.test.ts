import {
  AptRepository,
  type AptSuite,
  debArchitecture,
  indexApt,
  releaseFile
} from "@/lib/repository/apt";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeRun, missingCommand } from "@tests/unit/stage/fake-run";
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repo: AptSuite = {
  component: "main",
  origin: "wxx9248",
  suite: "trixie"
};
const now = new Date(Date.UTC(2026, 10, 11, 7, 36, 0));
const packages = "Package: fan-controllerd\nVersion: 1.0.0\n\n";

function sha256(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "apt-test-"));
  await mkdir(join(root, "pool", "main"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

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

describe("AptRepository", () => {
  const repository = new AptRepository({
    ...repo,
    description: "",
    folder: "deb",
    install: ["fan-controllerd", "extra"],
    sources: [{ asset: /\.deb$/u, github: "owner/fan" }],
    sourcesFile: "wxx9248.list"
  });

  it("adds an apt source at the folder's URL, then installs the packages", () => {
    expect(repository.setup("https://example.org").blocks).toEqual([
      {
        caption: "add the source",
        code: "echo 'deb [trusted=yes] https://example.org/deb trixie main' | sudo tee /etc/apt/sources.list.d/wxx9248.list"
      },
      {
        caption: "then",
        code: "sudo apt update && sudo apt install fan-controllerd extra"
      }
    ]);
  });

  it("names apt in the note", () => {
    expect(repository.setup("https://example.org").note).toBe(
      "Packages are unsigned; apt trusts them over HTTPS alone. Only the latest release of each package is kept."
    );
  });

  it("downloads into pool/<component> and indexes the repository folder", async () => {
    await mkdir(join(root, "deb", "pool", "main"), { recursive: true });
    await writeFile(join(root, "deb", "pool", "main", "fan_1_arm64.deb"), "");
    const { calls, run } = fakeRun({ "dpkg-scanpackages": packages });
    const downloads: string[] = [];

    await repository.stage(root, {
      downloader: {
        download: (folder) => {
          downloads.push(folder);
          return Promise.resolve();
        }
      },
      now,
      run,
      user: { gid: 1000, uid: 1000 }
    });

    expect(downloads).toEqual([join(root, "deb", "pool", "main")]);
    expect(calls[0]?.cwd).toBe(join(root, "deb"));
  });
});
