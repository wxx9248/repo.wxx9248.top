import { resolve } from "node:path";
import { statSync } from "node:fs";

export function resolveRepoDir(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd()
): string {
  const dir = resolve(cwd, env.REPO_DIR || "staging");
  const isDirectory =
    statSync(dir, { throwIfNoEntry: false })?.isDirectory() ?? false;
  if (!isDirectory) {
    throw new Error(
      `Repository tree not found at ${dir}. Run "pnpm stage", or set REPO_DIR (for example REPO_DIR=tests/fixtures/repo).`
    );
  }
  return dir;
}
