import { type Run, isMissingCommand } from "@/lib/stage/run";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const packageSuffix = ".pkg.tar.zst";

export async function indexPacman(
  directory: string,
  database: string,
  options: { gid: number; run: Run; uid: number }
): Promise<void> {
  const packages = (await readdir(directory))
    .filter((name) => name.endsWith(packageSuffix))
    .sort();
  if (!packages.length) {
    throw new Error(`No packages to index in ${directory}`);
  }
  try {
    /*
     * The stock image already has repo-add. --user keeps the output owned by
     * the caller. --userns=host opts out of a daemon's user namespace
     * remapping (userns-remap), under which uid 1000 inside the container is
     * not the caller and cannot write the mounted folder.
     */
    await options.run("docker", [
      "run",
      "--rm",
      "--userns=host",
      "--user",
      `${options.uid}:${options.gid}`,
      "-v",
      `${resolve(directory)}:/repo`,
      "-w",
      "/repo",
      "archlinux:base",
      "repo-add",
      `${database}.db.tar.gz`,
      ...packages
    ]);
  } catch (error) {
    if (isMissingCommand(error)) {
      throw new Error("docker was not found. Install Docker to run repo-add", {
        cause: error
      });
    }
    throw error;
  }
}
