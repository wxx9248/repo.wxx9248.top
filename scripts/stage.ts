import { repos } from "@/config/repos";
import { resolve } from "node:path";
import { run } from "@/lib/stage/run";
import { stage } from "@/lib/stage/stage";

try {
  // Both are missing only on Windows, where docker --user has no meaning
  if (!process.getuid || !process.getgid) {
    throw new Error("pnpm stage:repo needs a POSIX system");
  }
  await stage(resolve("staging"), repos, {
    gid: process.getgid(),
    log: (message) => console.log(message),
    now: new Date(),
    run,
    token: process.env.GITHUB_TOKEN,
    uid: process.getuid()
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
