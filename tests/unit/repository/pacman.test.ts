import { PacmanRepository, repoAdd } from "@/lib/repository/pacman";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeRun, missingCommand } from "@tests/unit/stage/fake-run";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const user = { gid: 1000, uid: 1000 };
let directory = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pacman-test-"));
});

afterEach(async () => {
  await rm(directory, { force: true, recursive: true });
});

describe("repoAdd", () => {
  it("runs repo-add in the stock image as the caller", async () => {
    await writeFile(
      join(directory, "linux-headers-6.1-1-x86_64.pkg.tar.zst"),
      ""
    );
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    await writeFile(join(directory, "notes.txt"), "");
    const { calls, run } = fakeRun();

    await repoAdd(directory, "wxx9248", { run, user });

    expect(calls.map(({ args, command }) => ({ args, command }))).toEqual([
      {
        args: [
          "run",
          "--rm",
          "--userns=host",
          "--user",
          "1000:1000",
          "-v",
          `${directory}:/repo`,
          "-w",
          "/repo",
          "archlinux:base",
          "repo-add",
          "wxx9248.db.tar.gz",
          "linux-6.1-1-x86_64.pkg.tar.zst",
          "linux-headers-6.1-1-x86_64.pkg.tar.zst"
        ],
        command: "docker"
      }
    ]);
  });

  it("throws when there are no packages", async () => {
    await writeFile(join(directory, "notes.txt"), "");
    const { calls, run } = fakeRun();

    await expect(repoAdd(directory, "wxx9248", { run, user })).rejects.toThrow(
      "No packages"
    );
    expect(calls).toEqual([]);
  });

  it("says to install Docker when docker is missing", async () => {
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    const { run } = fakeRun({ docker: missingCommand("docker") });

    await expect(repoAdd(directory, "wxx9248", { run, user })).rejects.toThrow(
      "Install Docker"
    );
  });

  it("passes other failures through", async () => {
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    const { run } = fakeRun({ docker: new Error("exit code 1") });

    await expect(repoAdd(directory, "wxx9248", { run, user })).rejects.toThrow(
      "exit code 1"
    );
  });
});

describe("PacmanRepository", () => {
  const repository = new PacmanRepository({
    architectures: {
      // eslint-disable-next-line camelcase
      x86_64: [{ asset: /\.pkg\.tar\.zst$/u, github: "owner/kernel" }]
    },
    database: "wxx9248",
    description: "",
    folder: "arch",
    install: ["linux", "linux-headers"]
  });

  it("appends a pacman section at the folder's URL, then installs the packages", () => {
    expect(repository.setup("https://example.org").blocks).toEqual([
      {
        caption: "append to /etc/pacman.conf",
        code: "[wxx9248]\nSigLevel = Optional TrustAll\nServer = https://example.org/arch/$arch"
      },
      { caption: "then", code: "sudo pacman -Syu linux linux-headers" }
    ]);
  });

  it("names pacman in the note", () => {
    expect(repository.setup("https://example.org").note).toBe(
      "Packages are unsigned; pacman trusts them over HTTPS alone. Only the latest release of each package is kept."
    );
  });

  it("indexes each architecture folder with repo-add", async () => {
    await mkdir(join(directory, "arch", "x86_64"), { recursive: true });
    await writeFile(
      join(directory, "arch", "x86_64", "linux-1-x86_64.pkg.tar.zst"),
      ""
    );
    const { calls, run } = fakeRun();
    const downloads: string[] = [];

    await repository.stage(directory, {
      downloader: {
        download: (folder) => {
          downloads.push(folder);
          return Promise.resolve();
        }
      },
      now: new Date(0),
      run,
      user
    });

    expect(downloads).toEqual([join(directory, "arch", "x86_64")]);
    expect(calls[0]?.args).toContain(
      `${join(directory, "arch", "x86_64")}:/repo`
    );
  });
});
