import {
  type Drop,
  type ReleaseSource,
  Repository,
  type RepositoryOptions,
  type SetupBlock,
  type StageContext
} from "@/lib/repository/repository";
import { join, resolve } from "node:path";
import { readdir } from "node:fs/promises";
import { runTool } from "@/lib/stage/run";

const packageSuffix = ".pkg.tar.zst";
// The stock image already has repo-add
const repoAddImage = "archlinux:base";

export interface PacmanOptions extends RepositoryOptions {
  // Sources per pacman architecture name, which is also the folder name
  architectures: Readonly<Record<string, readonly ReleaseSource[]>>;
  // The repository name in pacman.conf, and the database's base name
  database: string;
}

// Builds <database>.db.tar.gz and .files.tar.gz with repo-add, in the stock
// Arch Linux image, so the host needs only Docker
export async function repoAdd(
  directory: string,
  database: string,
  context: Pick<StageContext, "run" | "user">
): Promise<void> {
  const packages = (await readdir(directory))
    .filter((name) => name.endsWith(packageSuffix))
    .sort();
  if (!packages.length) {
    throw new Error(`No packages to index in ${directory}`);
  }
  const { gid, uid } = context.user;
  /*
   * --user keeps the output owned by the caller. --userns=host opts out of a
   * daemon's user namespace remapping (userns-remap), under which uid 1000
   * inside the container is not the caller and cannot write the mounted folder.
   */
  await runTool(
    context.run,
    "docker",
    [
      "run",
      "--rm",
      "--userns=host",
      "--user",
      `${uid}:${gid}`,
      "-v",
      `${resolve(directory)}:/repo`,
      "-w",
      "/repo",
      repoAddImage,
      "repo-add",
      `${database}.db.tar.gz`,
      ...packages
    ],
    { missing: "Install Docker to run repo-add" }
  );
}

// A pacman repository: one folder, and one database, per architecture
export class PacmanRepository extends Repository {
  readonly database: string;
  protected readonly manager = "pacman";
  readonly #architectures: Readonly<Record<string, readonly ReleaseSource[]>>;

  constructor({ architectures, database, ...options }: PacmanOptions) {
    super(options);
    this.#architectures = architectures;
    this.database = database;
  }

  protected drops(): Drop[] {
    return Object.entries(this.#architectures).map(
      ([architecture, sources]) => ({
        path: [architecture],
        sources
      })
    );
  }

  protected async index(
    directory: string,
    context: StageContext
  ): Promise<void> {
    for (const architecture of Object.keys(this.#architectures)) {
      await repoAdd(join(directory, architecture), this.database, context);
    }
  }

  protected setupBlocks(url: string): SetupBlock[] {
    return [
      {
        caption: "append to /etc/pacman.conf",
        code: `[${this.database}]\nSigLevel = Optional TrustAll\nServer = ${url}/$arch`
      },
      { caption: "then", code: `sudo pacman -Syu ${this.install.join(" ")}` }
    ];
  }
}
