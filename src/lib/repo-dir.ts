import { project } from "@/config/project";
import { resolve } from "node:path";
import { statSync } from "node:fs";

export function resolveRepoDir(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd()
): string {
  const dir = resolve(cwd, env[project.repoDirVariable] || project.stagingDir);
  const isDirectory =
    statSync(dir, { throwIfNoEntry: false })?.isDirectory() ?? false;
  if (!isDirectory) {
    throw new Error(
      `Repository tree not found at ${dir}. Run "${project.stageCommand}", or set ${project.repoDirVariable} (for example ${project.repoDirVariable}=${project.fixtureDir}).`
    );
  }
  return dir;
}
