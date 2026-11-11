import type { Entry, Folder } from "@/lib/tree/types";
import { lstat, readdir, readlink, stat } from "node:fs/promises";
import { join } from "node:path";

async function readSymlink(path: string, name: string): Promise<Entry> {
  const target = await readlink(path);
  const info = await stat(path).catch((cause: unknown) => {
    throw new Error(`Broken symlink: ${path} -> ${target}`, { cause });
  });
  if (info.isDirectory()) {
    throw new Error(
      `Symlink to a folder is not supported: ${path} -> ${target}`
    );
  }
  return {
    kind: "symlink",
    mtimeMs: info.mtimeMs,
    name,
    size: info.size,
    target
  };
}

async function visit(
  path: string,
  segments: string[],
  folders: Folder[]
): Promise<Folder> {
  // An empty folder keeps its own mtime.
  const folder: Folder = {
    entries: [],
    mtimeMs: (await stat(path)).mtimeMs,
    path: segments
  };
  // Reserve the slot now so parents land before their children.
  folders.push(folder);

  const dirents = await readdir(path, { withFileTypes: true });
  for (const dirent of dirents) {
    const childPath = join(path, dirent.name);
    if (dirent.isDirectory()) {
      const child = await visit(childPath, [...segments, dirent.name], folders);
      folder.entries.push({
        kind: "folder",
        mtimeMs: child.mtimeMs,
        name: dirent.name,
        size: 0
      });
    } else if (dirent.isSymbolicLink()) {
      folder.entries.push(await readSymlink(childPath, dirent.name));
    } else {
      const info = await lstat(childPath);
      folder.entries.push({
        kind: "file",
        mtimeMs: info.mtimeMs,
        name: dirent.name,
        size: info.size
      });
    }
  }

  const newest = Math.max(...folder.entries.map((entry) => entry.mtimeMs));
  if (Number.isFinite(newest)) {
    folder.mtimeMs = newest;
  }
  return folder;
}

// Every folder under `root`, root first. Entry and folder order is unspecified.
export async function walk(root: string): Promise<Folder[]> {
  const folders: Folder[] = [];
  await visit(root, [], folders);
  return folders;
}
