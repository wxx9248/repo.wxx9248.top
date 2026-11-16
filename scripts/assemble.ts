import { assemble } from "@/lib/assemble";
import { project } from "@/config/project";
import { resolveRepoDir } from "@/lib/repo-dir";
import { runCli } from "@/lib/cli";

await runCli(() => assemble(resolveRepoDir(), project.distDir));
