import { type Run, isMissingCommand } from "@/lib/stage/run";
import { basename, dirname, join } from "node:path";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import type { AptRepo } from "@/config/repos";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

export interface IndexedFile {
  path: string;
  sha256: string;
  size: number;
}

const debSuffix = ".deb";
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
  repo: Pick<AptRepo, "component" | "origin" | "suite">,
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
  try {
    return await run("dpkg-scanpackages", ["--arch", architecture, "pool"], {
      cwd: root
    });
  } catch (error) {
    if (isMissingCommand(error)) {
      throw new Error(
        "dpkg-scanpackages was not found. Install dpkg-dev to index apt packages",
        { cause: error }
      );
    }
    throw error;
  }
}

async function stagedArchitectures(root: string): Promise<string[]> {
  const names = await readdir(join(root, "pool"), { recursive: true });
  const architectures = new Set(
    names
      .map((name) => basename(name))
      .filter((name) => name.endsWith(debSuffix))
      .map(debArchitecture)
  );
  architectures.delete("all");
  if (!architectures.size) {
    throw new Error(
      `No architecture-specific .deb package found under ${join(root, "pool")}`
    );
  }
  return [...architectures].sort();
}

export async function indexApt(
  root: string,
  repo: AptRepo,
  options: { now: Date; run: Run }
): Promise<void> {
  const architectures = await stagedArchitectures(root);
  const suiteDirectory = join(root, "dists", repo.suite);
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
