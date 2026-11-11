import { assemble } from "@/lib/assemble";
import { resolveRepoDir } from "@/config/repo-dir";

try {
  await assemble(resolveRepoDir(), "dist");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
