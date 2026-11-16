import { AptRepository } from "@/lib/repository/apt";
import { PacmanRepository } from "@/lib/repository/pacman";
import type { Repository } from "@/lib/repository/repository";
import { site } from "@/config/site";

// The name package managers know these repositories by
const label = site.owner;

// Each repository is a top-level folder under the site root
export const repositories: readonly Repository[] = [
  new PacmanRepository({
    architectures: {
      // Pacman architecture names are fixed by the distribution
      // eslint-disable-next-line camelcase
      x86_64: [
        {
          asset: /\.pkg\.tar\.zst$/u,
          github: `${site.owner}/Arch-Linux-Kernel-Build`
        }
      ]
    },
    database: label,
    description:
      "pacman · custom Arch Linux kernel (linux, linux-headers, linux-docs)",
    folder: "archlinux",
    install: ["linux"]
  }),
  new AptRepository({
    component: "main",
    description: "apt · fan-controllerd, the PC fan controller daemon",
    folder: "debian",
    install: ["fan-controllerd"],
    origin: label,
    sources: [{ asset: /\.deb$/u, github: `${site.owner}/PC-Fan-Controller` }],
    sourcesFile: `${label}.list`,
    suite: "trixie"
  })
];

const byFolder = new Map(
  repositories.map((repository) => [repository.folder, repository])
);

export function findRepository(folder: string): Repository | null {
  return byFolder.get(folder) ?? null;
}
