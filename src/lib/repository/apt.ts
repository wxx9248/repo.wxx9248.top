import {
  type Drop,
  type ReleaseSource,
  Repository,
  type RepositoryOptions,
  type SetupBlock,
  type StageContext
} from "@/lib/repository/repository";
import { type Run, runTool } from "@/lib/stage/run";
import { basename, dirname, join } from "node:path";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

// The fields of an apt suite that its Release file names
export interface AptSuite {
  component: string;
  origin: string;
  suite: string;
}

export interface IndexedFile {
  path: string;
  sha256: string;
  size: number;
}

const debSuffix = ".deb";
// Packages are downloaded here, and dpkg-scanpackages scans it, so both use one name
const poolDir = "pool";
const distsDir = "dists";
// Architecture-independent packages, listed under every real architecture
const anyArchitecture = "all";
const gzipLevel = 9;

// Package files are named <name>_<version>_<architecture>.deb
export function debArchitecture(fileName: string): string {
  const [, architecture] = /_([^_]+)\.deb$/u.exec(fileName) ?? [];
  if (!architecture) {
    throw new Error(`${fileName} is not named <name>_<version>_<arch>.deb`);
  }
  return architecture;
}

export function releaseFile(
  repo: AptSuite,
  architectures: string[],
  date: Date,
  files: IndexedFile[]
): string {
  const lines = [
    `Origin: ${repo.origin}`,
    `Label: ${repo.origin}`,
    `Suite: ${repo.suite}`,
    `Codename: ${repo.suite}`,
    `Date: ${date.toUTCString().replace("GMT", "UTC")}`,
    `Architectures: ${architectures.join(" ")}`,
    `Components: ${repo.component}`,
    "SHA256:",
    ...[...files]
      .sort((left, right) => left.path.localeCompare(right.path, "en"))
      .map((file) => ` ${file.sha256} ${file.size} ${file.path}`)
  ];
  return `${lines.join("\n")}\n`;
}

function describeFile(path: string, content: Buffer | string): IndexedFile {
  const bytes = Buffer.from(content);
  return {
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length
  };
}

async function scanPackages(
  root: string,
  architecture: string,
  run: Run
): Promise<string> {
  return await runTool(
    run,
    "dpkg-scanpackages",
    ["--arch", architecture, poolDir],
    { cwd: root, missing: "Install dpkg-dev to index apt packages" }
  );
}

async function stagedArchitectures(root: string): Promise<string[]> {
  const names = await readdir(join(root, poolDir), { recursive: true });
  const architectures = new Set(
    names
      .map((name) => basename(name))
      .filter((name) => name.endsWith(debSuffix))
      .map(debArchitecture)
  );
  architectures.delete(anyArchitecture);
  if (!architectures.size) {
    throw new Error(
      `No architecture-specific .deb package found under ${join(root, poolDir)}`
    );
  }
  return [...architectures].sort();
}

// Writes dists/<suite>/ for the packages under pool/
export async function indexApt(
  root: string,
  repo: AptSuite,
  options: Pick<StageContext, "now" | "run">
): Promise<void> {
  const architectures = await stagedArchitectures(root);
  const suiteDirectory = join(root, distsDir, repo.suite);
  const files: IndexedFile[] = [];

  for (const architecture of architectures) {
    const packages = await scanPackages(root, architecture, options.run);
    // Like gzip -9 -n: no name or time in the header, so output is stable
    const compressed = gzipSync(packages, { level: gzipLevel });
    const relative = `${repo.component}/binary-${architecture}/Packages`;
    const target = join(suiteDirectory, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, packages);
    await writeFile(`${target}.gz`, compressed);
    files.push(
      describeFile(relative, packages),
      describeFile(`${relative}.gz`, compressed)
    );
  }

  await writeFile(
    join(suiteDirectory, "Release"),
    releaseFile(repo, architectures, options.now, files)
  );
}

export interface AptOptions extends RepositoryOptions, AptSuite {
  sources: readonly ReleaseSource[];
  // File name under /etc/apt/sources.list.d/
  sourcesFile: string;
}

// A flat-pool apt repository with one suite and one component
export class AptRepository extends Repository implements AptSuite {
  readonly component: string;
  readonly origin: string;
  readonly sourcesFile: string;
  readonly suite: string;
  protected readonly manager = "apt";
  readonly #sources: readonly ReleaseSource[];

  constructor({
    component,
    origin,
    sources,
    sourcesFile,
    suite,
    ...options
  }: AptOptions) {
    super(options);
    this.component = component;
    this.origin = origin;
    this.#sources = sources;
    this.sourcesFile = sourcesFile;
    this.suite = suite;
  }

  protected drops(): Drop[] {
    return [{ path: [poolDir, this.component], sources: this.#sources }];
  }

  protected async index(
    directory: string,
    context: StageContext
  ): Promise<void> {
    await indexApt(directory, this, context);
  }

  protected setupBlocks(url: string): SetupBlock[] {
    return [
      {
        caption: "add the source",
        code: `echo 'deb [trusted=yes] ${url} ${this.suite} ${this.component}' | sudo tee /etc/apt/sources.list.d/${this.sourcesFile}`
      },
      {
        caption: "then",
        code: `sudo apt update && sudo apt install ${this.install.join(" ")}`
      }
    ];
  }
}
