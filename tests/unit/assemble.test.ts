import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assemble, findClashes } from "@/lib/assemble";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("assemble", () => {
  let source = "";
  let destination = "";

  beforeEach(async () => {
    const tmp = await mkdtemp(join(tmpdir(), "assemble-"));
    source = join(tmp, "staging");
    destination = join(tmp, "dist");
    await mkdir(source);
    await mkdir(destination);
  });

  afterEach(async () => {
    await rm(join(source, ".."), { force: true, recursive: true });
  });

  it("finds no clashes when only folders overlap", async () => {
    await mkdir(join(source, "archlinux", "x86_64"), { recursive: true });
    await writeFile(join(source, "archlinux", "x86_64", "a.pkg"), "a");
    await mkdir(join(destination, "archlinux"));
    await writeFile(join(destination, "archlinux", "index.html"), "<html>");

    expect(await findClashes(source, destination)).toEqual([]);
  });

  it("reports a staged index.html as a clash", async () => {
    await mkdir(join(source, "archlinux"));
    await writeFile(join(source, "archlinux", "index.html"), "staged");
    await mkdir(join(destination, "archlinux"));
    await writeFile(join(destination, "archlinux", "index.html"), "generated");

    expect(await findClashes(source, destination)).toEqual([
      join("archlinux", "index.html")
    ]);
  });

  it("reports a staged file over a generated folder as a clash", async () => {
    await writeFile(join(source, "_astro"), "staged");
    await mkdir(join(destination, "_astro"));

    expect(await findClashes(source, destination)).toEqual(["_astro"]);
  });

  it("reports a staged folder over a generated file as a clash", async () => {
    await mkdir(join(source, "robots.txt"));
    await writeFile(join(destination, "robots.txt"), "generated");

    expect(await findClashes(source, destination)).toEqual(["robots.txt"]);
  });

  it("sorts clashes", async () => {
    await writeFile(join(source, "b.txt"), "b");
    await writeFile(join(source, "a.txt"), "a");
    await writeFile(join(destination, "b.txt"), "x");
    await writeFile(join(destination, "a.txt"), "x");

    expect(await findClashes(source, destination)).toEqual(["a.txt", "b.txt"]);
  });

  it("copies files and keeps symlinks as symlinks", async () => {
    await mkdir(join(source, "archlinux"));
    await writeFile(join(source, "archlinux", "wxx9248.db.tar.gz"), "db");
    await symlink("wxx9248.db.tar.gz", join(source, "archlinux", "wxx9248.db"));
    await writeFile(join(destination, "index.html"), "generated");

    await assemble(source, destination);

    const link = join(destination, "archlinux", "wxx9248.db");
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readlink(link)).toBe("wxx9248.db.tar.gz");
    expect(
      await readFile(
        join(destination, "archlinux", "wxx9248.db.tar.gz"),
        "utf8"
      )
    ).toBe("db");
    expect(await readFile(join(destination, "index.html"), "utf8")).toBe(
      "generated"
    );
  });

  it("refuses and copies nothing when anything clashes", async () => {
    await writeFile(join(source, "index.html"), "staged");
    await writeFile(join(source, "other.txt"), "other");
    await writeFile(join(destination, "index.html"), "generated");

    await expect(assemble(source, destination)).rejects.toThrow(
      "Staged files would replace generated ones: index.html"
    );
    expect((await readdir(destination)).sort()).toEqual(["index.html"]);
    expect(await readFile(join(destination, "index.html"), "utf8")).toBe(
      "generated"
    );
  });
});
