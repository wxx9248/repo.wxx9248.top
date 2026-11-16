import type {
  AssetDownloader,
  ReleaseSource,
  StageContext
} from "@/lib/repository/repository";
import { describe, expect, it } from "vitest";
import { FakeRepository } from "@tests/unit/repository/fake-repository";
import { fakeRun } from "@tests/unit/stage/fake-run";
import { join } from "node:path";

const kernel: ReleaseSource = { asset: /\.zst$/u, github: "owner/kernel" };
const extras: ReleaseSource = { asset: /\.zst$/u, github: "owner/extras" };
const now = new Date(Date.UTC(2026, 10, 11));

function recordingContext(events: string[]): StageContext {
  const downloader: AssetDownloader = {
    download: (directory, sources) => {
      events.push(
        `download ${directory} ${sources.map((source) => source.github).join(",")}`
      );
      return Promise.resolve();
    }
  };
  return { downloader, now, run: fakeRun().run, user: { gid: 1, uid: 1 } };
}

describe("Repository", () => {
  it("downloads every drop under its folder, then indexes that folder", async () => {
    const repository = new FakeRepository("repo", [
      { path: ["a"], sources: [kernel] },
      { path: ["b", "c"], sources: [extras] }
    ]);
    const events: string[] = [];

    await repository.stage("/root", recordingContext(events));

    expect([...events, ...repository.events]).toEqual([
      `download ${join("/root", "repo", "a")} owner/kernel`,
      `download ${join("/root", "repo", "b", "c")} owner/extras`,
      `index ${join("/root", "repo")} ${now.toISOString()}`
    ]);
  });

  it("lists the sources of all its drops", () => {
    const repository = new FakeRepository("repo", [
      { path: ["a"], sources: [kernel] },
      { path: ["b"], sources: [extras] }
    ]);

    expect(repository.sources()).toEqual([kernel, extras]);
  });

  it("builds the setup snippets from the folder's URL and names the manager in the note", () => {
    const guide = new FakeRepository("repo").setup("https://example.org");

    expect(guide).toEqual({
      blocks: [
        { caption: "add", code: "fake add https://example.org/repo pkg" }
      ],
      note: "Packages are unsigned; fake trusts them over HTTPS alone. Only the latest release of each package is kept."
    });
  });
});
