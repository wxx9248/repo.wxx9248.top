import type {
  AssetDownloader,
  ReleaseSource
} from "@/lib/repository/repository";
import {
  type Fetch,
  type GitHubClient,
  type ReleaseAsset,
  selectAssets
} from "@/lib/stage/github";
import { downloadAsset } from "@/lib/stage/download";

export interface ReleaseDownloaderOptions {
  fetch?: Fetch;
  // Called with the path of each downloaded file
  log?: (path: string) => void;
}

// Downloads the assets of each source's latest GitHub release
export class ReleaseDownloader implements AssetDownloader {
  readonly #github: GitHubClient;
  readonly #options: ReleaseDownloaderOptions;

  constructor(github: GitHubClient, options: ReleaseDownloaderOptions = {}) {
    this.#github = github;
    this.#options = options;
  }

  // Looks up every release before downloading anything, so two sources that
  // Ship a file with the same name fail before a byte is written
  async download(
    directory: string,
    sources: readonly ReleaseSource[]
  ): Promise<void> {
    const assets = await this.#collect(directory, sources);
    for (const asset of assets) {
      // Await first: optional chaining would skip the download without a logger
      const path = await downloadAsset(asset, directory, this.#options);
      this.#options.log?.(path);
    }
  }

  async #collect(
    directory: string,
    sources: readonly ReleaseSource[]
  ): Promise<ReleaseAsset[]> {
    const assets: ReleaseAsset[] = [];
    const origins = new Map<string, string>();
    for (const source of sources) {
      const release = await this.#github.latestRelease(source.github);
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
    return assets;
  }
}
