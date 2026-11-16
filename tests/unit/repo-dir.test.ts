import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveRepoDir } from "@/lib/repo-dir";
import { tmpdir } from "node:os";

describe("resolveRepoDir", () => {
  let tmp = "";

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), "repo-dir-"));
  });

  afterEach(async () => {
    await rm(tmp, { force: true, recursive: true });
  });

  it("defaults to staging under cwd", async () => {
    await mkdir(join(tmp, "staging"));
    expect(resolveRepoDir({}, tmp)).toBe(join(tmp, "staging"));
  });

  it("uses REPO_DIR, relative to cwd", async () => {
    await mkdir(join(tmp, "fixtures", "repo"), { recursive: true });
    expect(resolveRepoDir({ REPO_DIR: "fixtures/repo" }, tmp)).toBe(
      join(tmp, "fixtures", "repo")
    );
  });

  it("accepts an absolute REPO_DIR", async () => {
    const elsewhere = join(tmp, "elsewhere");
    await mkdir(elsewhere);
    expect(resolveRepoDir({ REPO_DIR: elsewhere }, join(tmp, "other"))).toBe(
      elsewhere
    );
  });

  it("throws when the folder is missing", () => {
    expect(() => resolveRepoDir({}, tmp)).toThrow(/pnpm stage:repo.*REPO_DIR/u);
  });

  it("throws when REPO_DIR is a file", async () => {
    await writeFile(join(tmp, "file"), "x");
    expect(() => resolveRepoDir({ REPO_DIR: "file" }, tmp)).toThrow(
      /Repository tree not found/u
    );
  });
});
