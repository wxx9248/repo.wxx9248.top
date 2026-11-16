import { describe, expect, it } from "vitest";
import { findRepository, repositories } from "@/config/repos";

const githubSlug = /^[\w.-]+\/[\w.-]+$/u;
const folderName = /^[a-z0-9-]+$/u;

describe("repositories", () => {
  it("every github source is owner/repo", () => {
    for (const repository of repositories) {
      expect(repository.sources().length).toBeGreaterThan(0);
      for (const source of repository.sources()) {
        expect(source.github).toMatch(githubSlug);
      }
    }
  });

  it("every repository installs at least one package", () => {
    for (const repository of repositories) {
      expect(repository.install.length).toBeGreaterThan(0);
    }
  });

  it("folders are unique, URL-safe names", () => {
    const folders = repositories.map((repository) => repository.folder);
    expect(new Set(folders).size).toBe(folders.length);
    for (const folder of folders) {
      expect(folder).toMatch(folderName);
    }
  });

  it("finds a repository by folder, and nothing for other names", () => {
    expect(findRepository("archlinux")?.folder).toBe("archlinux");
    expect(findRepository("x86_64")).toBeNull();
  });
});

describe("setup snippets", () => {
  it("point pacman at this site", () => {
    expect(
      findRepository("archlinux")?.setup("https://repo.wxx9248.top").blocks
    ).toEqual([
      {
        caption: "append to /etc/pacman.conf",
        code: "[wxx9248]\nSigLevel = Optional TrustAll\nServer = https://repo.wxx9248.top/archlinux/$arch"
      },
      { caption: "then", code: "sudo pacman -Syu linux" }
    ]);
  });

  it("point apt at this site", () => {
    expect(
      findRepository("debian")?.setup("https://repo.wxx9248.top").blocks
    ).toEqual([
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
});
