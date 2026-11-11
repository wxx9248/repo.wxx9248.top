export interface ReleaseSource {
  asset: RegExp;
  // Release owner and repository, as "<owner>/<repo>"
  github: string;
}

export interface PacmanRepo {
  kind: "pacman";
  description: string;
  database: string;
  install: string[];
  architectures: Record<string, ReleaseSource[]>;
}

export interface AptRepo {
  kind: "apt";
  description: string;
  origin: string;
  suite: string;
  component: string;
  sourcesFile: string;
  install: string[];
  sources: ReleaseSource[];
}

export type Repo = AptRepo | PacmanRepo;

// Keys are the top-level folder names under the site root
export const repos: Record<string, Repo> = {
  archlinux: {
    architectures: {
      // Pacman architecture names are fixed by the distribution
      // eslint-disable-next-line camelcase
      x86_64: [
        {
          asset: /\.pkg\.tar\.zst$/u,
          github: "wxx9248/Arch-Linux-Kernel-Build"
        }
      ]
    },
    database: "wxx9248",
    description:
      "pacman · custom Arch Linux kernel (linux, linux-headers, linux-docs)",
    install: ["linux"],
    kind: "pacman"
  },
  debian: {
    component: "main",
    description: "apt · fan-controllerd, the PC fan controller daemon",
    install: ["fan-controllerd"],
    kind: "apt",
    origin: "wxx9248",
    sources: [{ asset: /\.deb$/u, github: "wxx9248/PC-Fan-Controller" }],
    sourcesFile: "wxx9248.list",
    suite: "trixie"
  }
};
