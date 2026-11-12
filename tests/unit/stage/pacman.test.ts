import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeRun, missingCommand } from "@tests/unit/stage/fake-run";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { indexPacman } from "@/lib/stage/pacman";
import { join } from "node:path";
import { tmpdir } from "node:os";

let directory = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pacman-test-"));
});

afterEach(async () => {
  await rm(directory, { force: true, recursive: true });
});

describe("indexPacman", () => {
  it("runs repo-add in the stock image as the caller", async () => {
    await writeFile(
      join(directory, "linux-headers-6.1-1-x86_64.pkg.tar.zst"),
      ""
    );
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    await writeFile(join(directory, "notes.txt"), "");
    const { calls, run } = fakeRun();

    await indexPacman(directory, "wxx9248", { gid: 1000, run, uid: 1000 });

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

    await expect(
      indexPacman(directory, "wxx9248", { gid: 1000, run, uid: 1000 })
    ).rejects.toThrow("No packages");
    expect(calls).toEqual([]);
  });

  it("says to install Docker when docker is missing", async () => {
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    const { run } = fakeRun({ docker: missingCommand("docker") });

    await expect(
      indexPacman(directory, "wxx9248", { gid: 1000, run, uid: 1000 })
    ).rejects.toThrow("Install Docker");
  });

  it("passes other failures through", async () => {
    await writeFile(join(directory, "linux-6.1-1-x86_64.pkg.tar.zst"), "");
    const { run } = fakeRun({ docker: new Error("exit code 1") });

    await expect(
      indexPacman(directory, "wxx9248", { gid: 1000, run, uid: 1000 })
    ).rejects.toThrow("exit code 1");
  });
});
