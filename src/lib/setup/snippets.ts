import type { Repo } from "@/config/repos";

export interface SetupBlock {
  caption: string;
  code: string;
}

export function setupBlocks(
  name: string,
  repo: Repo,
  siteUrl: string
): SetupBlock[] {
  const packages = repo.install.join(" ");
  if (repo.kind === "pacman") {
    return [
      {
        caption: "append to /etc/pacman.conf",
        code: `[${repo.database}]\nSigLevel = Optional TrustAll\nServer = ${siteUrl}/${name}/$arch`
      },
      { caption: "then", code: `sudo pacman -Sy ${packages}` }
    ];
  }
  return [
    {
      caption: "add the source",
      code: `echo 'deb [trusted=yes] ${siteUrl}/${name} ${repo.suite} ${repo.component}' | sudo tee /etc/apt/sources.list.d/${repo.sourcesFile}`
    },
    {
      caption: "then",
      code: `sudo apt update && sudo apt install ${packages}`
    }
  ];
}

export function setupNote(repo: Repo): string {
  const manager = repo.kind === "pacman" ? "pacman" : "apt";
  return `Packages are unsigned; ${manager} trusts them over HTTPS alone. Only the latest release of each package is kept.`;
}
