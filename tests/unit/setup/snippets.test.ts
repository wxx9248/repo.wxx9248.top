import { describe, expect, it } from "vitest";
import { setupBlocks, setupNote } from "@/lib/setup/snippets";
import { repos } from "@/config/repos";
import { site } from "@/config/site";

describe("setupBlocks", () => {
  it("appends a pacman section, then installs the package", () => {
    expect(setupBlocks("archlinux", repos.archlinux, site.url)).toEqual([
      {
        caption: "append to /etc/pacman.conf",
        code: "[wxx9248]\nSigLevel = Optional TrustAll\nServer = https://repo.wxx9248.top/archlinux/$arch"
      },
      { caption: "then", code: "sudo pacman -Sy linux" }
    ]);
  });

  it("adds an apt source, then installs the package", () => {
    expect(setupBlocks("debian", repos.debian, site.url)).toEqual([
      {
        caption: "add the source",
        code: "echo 'deb [trusted=yes] https://repo.wxx9248.top/debian trixie main' | sudo tee /etc/apt/sources.list.d/wxx9248.list"
      },
      {
        caption: "then",
        code: "sudo apt update && sudo apt install fan-controllerd"
      }
    ]);
  });

  it("follows the site URL and the folder name", () => {
    const [first] = setupBlocks("arch", repos.archlinux, "https://example.org");
    expect(first?.code).toContain("Server = https://example.org/arch/$arch");
  });
});

describe("setupNote", () => {
  it("names the package manager", () => {
    expect(setupNote(repos.archlinux)).toBe(
      "Packages are unsigned; pacman trusts them over HTTPS alone. Only the latest release of each package is kept."
    );
    expect(setupNote(repos.debian)).toBe(
      "Packages are unsigned; apt trusts them over HTTPS alone. Only the latest release of each package is kept."
    );
  });
});
