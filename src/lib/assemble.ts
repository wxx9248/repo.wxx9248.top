import { cp, lstat, readdir } from "node:fs/promises";
import type { Stats } from "node:fs";
import { hasErrorCode } from "@/lib/errors";
import { join } from "node:path";

async function statOrNull(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
}

async function collectClashes(
  source: string,
  destination: string,
  relative: string,
  clashes: string[]
): Promise<void> {
  const entries = await readdir(join(source, relative), {
    withFileTypes: true
  });
  for (const entry of entries) {
    const path = join(relative, entry.name);
    const existing = await statOrNull(join(destination, path));
    if (entry.isDirectory()) {
      if (existing === null || existing.isDirectory()) {
        await collectClashes(source, destination, path, clashes);
      } else {
        clashes.push(path);
      }
    } else if (existing !== null) {
      clashes.push(path);
    }
  }
}

/**
 * Lists the staged paths that would replace generated ones: a non-folder
 * whose path already exists in the destination, or a folder whose path is a
 * file there. Folders present on both sides are fine.
 */
export async function findClashes(
  source: string,
  destination: string
): Promise<string[]> {
  const clashes: string[] = [];
  await collectClashes(source, destination, "", clashes);
  return clashes.sort();
}

export async function assemble(
  source: string,
  destination: string
): Promise<void> {
  const clashes = await findClashes(source, destination);
  if (clashes.length) {
    throw new Error(
      `Staged files would replace generated ones: ${clashes.join(", ")}`
    );
  }
  await cp(source, destination, { recursive: true, verbatimSymlinks: true });
}
