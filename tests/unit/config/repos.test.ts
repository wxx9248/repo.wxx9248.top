import { type AptRepo, type PacmanRepo, repos } from "@/config/repos";
import { describe, expect, it } from "vitest";

const githubSlug = /^[\w.-]+\/[\w.-]+$/u;
const folderName = /^[a-z0-9-]+$/u;

const sourcesOf = (repo: AptRepo | PacmanRepo) =>
  repo.kind === "apt" ? repo.sources : Object.values(repo.architectures).flat();

describe("repos", () => {
  it("every github source is owner/repo", () => {
    for (const repo of Object.values(repos)) {
      const sources = sourcesOf(repo);
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source.github).toMatch(githubSlug);
      }
    }
  });

  it("every repo installs at least one package", () => {
    for (const repo of Object.values(repos)) {
      expect(repo.install.length).toBeGreaterThan(0);
    }
  });

  it("repo keys are URL-safe folder names", () => {
    for (const key of Object.keys(repos)) {
      expect(key).toMatch(folderName);
    }
  });
});
