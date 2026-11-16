import { GitHubClient } from "@/lib/stage/github";
import { ReleaseDownloader } from "@/lib/stage/releases";
import { project } from "@/config/project";
import { repositories } from "@/config/repos";
import { resolve } from "node:path";
import { run } from "@/lib/stage/run";
import { runCli } from "@/lib/cli";
import { stage } from "@/lib/stage/stage";

// The composition root: the only place that picks real implementations
await runCli(async () => {
  // Both are missing only on Windows, where docker --user has no meaning
  if (!process.getuid || !process.getgid) {
    throw new Error(`${project.stageCommand} needs a POSIX system`);
  }
  const github = new GitHubClient({ token: process.env.GITHUB_TOKEN });
  await stage(resolve(project.stagingDir), repositories, {
    downloader: new ReleaseDownloader(github, {
      log: (path) => console.log(path)
    }),
    now: new Date(),
    run,
    user: { gid: process.getgid(), uid: process.getuid() }
  });
});
