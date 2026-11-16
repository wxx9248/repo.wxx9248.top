import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  utimes,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { walk } from "@/lib/tree/walk";

const SECOND = 1000;
const OLD = 1_000_000;
const MID = 2_000_000;
const NEW = 3_000_000;

let root = "";

async function put(
  relative: string,
  content: string,
  mtimeSeconds: number
): Promise<void> {
  const path = join(root, relative);
  await writeFile(path, content);
  await utimes(path, mtimeSeconds, mtimeSeconds);
}

async function folderAt(path: string[]) {
  const folders = await walk(root);
  const folder = folders.find(
    (candidate) => candidate.path.join("/") === path.join("/")
  );
  if (!folder) {
    throw new Error(`no folder at ${path.join("/")}`);
  }
  return folder;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "walk-"));
});

afterEach(async () => {
  await rm(root, { force: true, recursive: true });
});

describe("walk", () => {
  it("lists every folder, root first", async () => {
    await mkdir(join(root, "a", "b"), { recursive: true });
    await mkdir(join(root, "c"));

    const folders = await walk(root);

    expect(folders[0]?.path).toEqual([]);
    expect(new Set(folders.map((folder) => folder.path.join("/")))).toEqual(
      new Set(["", "a", "a/b", "c"])
    );
    expect(folders).toHaveLength(4);
  });

  it("reports file sizes and mtimes", async () => {
    await put("hello.txt", "hello", OLD);

    const folder = await folderAt([]);

    expect(folder.entries).toEqual([
      { kind: "file", mtimeMs: OLD * SECOND, name: "hello.txt", size: 5 }
    ]);
  });

  it("an empty folder has no entries and its own mtime", async () => {
    await mkdir(join(root, "empty"));
    await utimes(join(root, "empty"), MID, MID);

    const folder = await folderAt(["empty"]);
    const parent = await folderAt([]);

    expect(folder.entries).toEqual([]);
    expect(folder.mtimeMs).toBe(MID * SECOND);
    expect(parent.entries).toEqual([
      { kind: "folder", mtimeMs: MID * SECOND, name: "empty", size: 0 }
    ]);
  });

  it("a folder's mtime is its newest descendant's", async () => {
    await mkdir(join(root, "a", "b"), { recursive: true });
    await put("top.txt", "x", OLD);
    await put("a/mid.txt", "x", MID);
    await put("a/b/deep.txt", "x", NEW);
    // Touching the folders themselves must not matter.
    await utimes(join(root, "a"), OLD, OLD);
    await utimes(join(root, "a", "b"), OLD, OLD);

    expect((await folderAt([])).mtimeMs).toBe(NEW * SECOND);
    expect((await folderAt(["a"])).mtimeMs).toBe(NEW * SECOND);
    expect((await folderAt(["a", "b"])).mtimeMs).toBe(NEW * SECOND);
    expect(
      (await folderAt([])).entries.find((entry) => entry.name === "a")?.mtimeMs
    ).toBe(NEW * SECOND);
    expect(
      (await folderAt(["a"])).entries.find((entry) => entry.name === "b")
        ?.mtimeMs
    ).toBe(NEW * SECOND);
  });

  it("a symlink to a file reports kind symlink, the target text, and the target's size", async () => {
    await put("wxx9248.db.tar.gz", "archive", MID);
    await symlink("wxx9248.db.tar.gz", join(root, "wxx9248.db"));

    const folder = await folderAt([]);

    expect(folder.entries.find((entry) => entry.name === "wxx9248.db")).toEqual(
      {
        kind: "symlink",
        mtimeMs: MID * SECOND,
        name: "wxx9248.db",
        size: 7,
        target: "wxx9248.db.tar.gz"
      }
    );
  });

  it("throws on a symlink to a folder", async () => {
    await mkdir(join(root, "real"));
    await symlink("real", join(root, "alias"));

    await expect(walk(root)).rejects.toThrow(join(root, "alias"));
  });

  it("throws on a broken symlink", async () => {
    await symlink("missing", join(root, "dangling"));

    await expect(walk(root)).rejects.toThrow(join(root, "dangling"));
  });

  it("keeps odd names intact", async () => {
    const names = ["foo-1:2.0+r1.pkg", "a b", "ü"];
    for (const name of names) {
      await put(name, "x", OLD);
    }

    const folder = await folderAt([]);

    expect(folder.entries.map((entry) => entry.name).sort()).toEqual(
      [...names].sort()
    );
  });
});
