import type { Run } from "@/lib/stage/run";
import { join } from "node:path";

// Where a repository's packages come from
export interface ReleaseSource {
  // Matches the names of the release assets to take
  readonly asset: RegExp;
  // Release owner and repository, as "<owner>/<repo>"
  readonly github: string;
}

// Fetches the packages a drop lists into a folder
export interface AssetDownloader {
  download(directory: string, sources: readonly ReleaseSource[]): Promise<void>;
}

// What staging hands every repository; tests pass fakes
export interface StageContext {
  readonly downloader: AssetDownloader;
  // Stamped into generated index files
  readonly now: Date;
  readonly run: Run;
  // Owner of files written by tools that run in a container
  readonly user: { readonly gid: number; readonly uid: number };
}

// A folder that release assets are downloaded into, relative to the repository
export interface Drop {
  readonly path: readonly string[];
  readonly sources: readonly ReleaseSource[];
}

export interface SetupBlock {
  caption: string;
  code: string;
}

// How a visitor adds the repository to their package manager
export interface SetupGuide {
  blocks: SetupBlock[];
  note: string;
}

export interface RepositoryOptions {
  // One line, shown beside the folder at the site root
  description: string;
  // Top-level folder name under the site root
  folder: string;
  // Packages the setup snippet installs
  install: readonly string[];
}

/**
 * One package repository: where its packages come from, how its index is
 * built, and how a client adds it. Each package format is a subclass;
 * staging and the setup panel only call the methods below.
 */
export abstract class Repository {
  readonly description: string;
  readonly folder: string;
  readonly install: readonly string[];

  // The package manager's name, as the setup note spells it
  protected abstract readonly manager: string;

  constructor(options: RepositoryOptions) {
    this.description = options.description;
    this.folder = options.folder;
    this.install = options.install;
  }

  sources(): ReleaseSource[] {
    return this.drops().flatMap((drop) => drop.sources);
  }

  // Downloads every drop under <root>/<folder>, then builds the index there.
  // Subclasses supply the steps, not the order.
  async stage(root: string, context: StageContext): Promise<void> {
    const directory = join(root, this.folder);
    for (const drop of this.drops()) {
      await context.downloader.download(
        join(directory, ...drop.path),
        drop.sources
      );
    }
    await this.index(directory, context);
  }

  setup(siteUrl: string): SetupGuide {
    return {
      blocks: this.setupBlocks(`${siteUrl}/${this.folder}`),
      note: `Packages are unsigned; ${this.manager} trusts them over HTTPS alone. Only the latest release of each package is kept.`
    };
  }

  protected abstract drops(): Drop[];

  // Writes the package manager's index for the downloaded packages
  protected abstract index(
    directory: string,
    context: StageContext
  ): Promise<void>;

  // The snippets, given the repository's public URL
  protected abstract setupBlocks(url: string): SetupBlock[];
}
