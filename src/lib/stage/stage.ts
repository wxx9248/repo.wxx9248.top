import {
  type Fetch,
  type ReleaseAsset,
  fetchLatestRelease,
  selectAssets
} from "@/lib/stage/github";
import type { ReleaseSource, Repo } from "@/config/repos";
import { mkdir, rm } from "node:fs/promises";
import type { Run } from "@/lib/stage/run";
import { downloadAsset } from "@/lib/stage/download";
import { indexApt } from "@/lib/stage/apt";
import { indexPacman } from "@/lib/stage/pacman";
import { join } from "node:path";

export interface StageOptions {
  fetch?: Fetch;
  gid: number;
  // Called with the path of each downloaded file
  log?: (message: string) => void;
  now: Date;
  run: Run;
  token?: string;
  uid: number;
}

// Looks up every source's latest release, refuses two assets with one name,
// Then downloads them all into the directory
async function downloadSources(
  directory: string,
  sources: ReleaseSource[],
  options: StageOptions
): Promise<void> {
  const assets: ReleaseAsset[] = [];
  const origins = new Map<string, string>();
  for (const source of sources) {
    const release = await fetchLatestRelease(source.github, options);
    for (const asset of selectAssets(release, source.asset)) {
      const previous = origins.get(asset.name);
      if (previous) {
        throw new Error(
          `${asset.name} comes from both ${previous} and ${source.github}, into ${directory}`
        );
      }
      origins.set(asset.name, source.github);
      assets.push(asset);
    }
  }
  for (const asset of assets) {
    // Await first: optional chaining would skip the download without a logger
    const path = await downloadAsset(asset, directory, options);
    options.log?.(path);
  }
}

export async function stage(
  root: string,
  repos: Record<string, Repo>,
  options: StageOptions
): Promise<void> {
  await rm(root, { force: true, recursive: true });
  await mkdir(root, { recursive: true });

  for (const [name, repo] of Object.entries(repos)) {
    if (repo.kind === "pacman") {
      for (const [architecture, sources] of Object.entries(
        repo.architectures
      )) {
        const directory = join(root, name, architecture);
        await downloadSources(directory, sources, options);
        await indexPacman(directory, repo.database, options);
      }
    } else {
      const repoRoot = join(root, name);
      await downloadSources(
        join(repoRoot, "pool", repo.component),
        repo.sources,
        options
      );
      await indexApt(repoRoot, repo, options);
    }
  }
}
