import { GitHubClient, type Release, selectAssets } from "@/lib/stage/github";
import { describe, expect, it } from "vitest";
import { fakeFetch, jsonResponse } from "@tests/unit/stage/fake-fetch";

const repo = "wxx9248/PC-Fan-Controller";
const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
const releaseUrl =
  "https://github.com/wxx9248/PC-Fan-Controller/releases/tag/v1.0.0";
const debDigest =
  "sha256:bf2cae0ae7d003980d5c70078593a0d46d1c52eb3ba829cd4e55a92a9819f488";

/* eslint-disable camelcase -- GitHub API wire format */
const apiRelease = {
  assets: [
    {
      browser_download_url:
        "https://github.com/wxx9248/PC-Fan-Controller/releases/download/v1.0.0/fan-controllerd_1.0.0_arm64.deb",
      digest: debDigest,
      name: "fan-controllerd_1.0.0_arm64.deb",
      size: 579492,
      updated_at: "2026-10-19T05:24:30Z"
    },
    {
      browser_download_url:
        "https://github.com/wxx9248/PC-Fan-Controller/releases/download/v1.0.0/notes.txt",
      digest: null,
      name: "notes.txt",
      size: 12,
      updated_at: "2026-10-19T05:24:31Z"
    }
  ],
  html_url: releaseUrl
};
/* eslint-enable camelcase */

describe("GitHubClient.latestRelease", () => {
  it("maps the latest release", async () => {
    const { fetch } = fakeFetch({ [apiUrl]: () => jsonResponse(apiRelease) });

    const release = await new GitHubClient({ fetch }).latestRelease(repo);

    expect(release).toEqual({
      assets: [
        {
          digest: debDigest,
          name: "fan-controllerd_1.0.0_arm64.deb",
          size: 579492,
          updatedAt: "2026-10-19T05:24:30Z",
          url: "https://github.com/wxx9248/PC-Fan-Controller/releases/download/v1.0.0/fan-controllerd_1.0.0_arm64.deb"
        },
        {
          digest: null,
          name: "notes.txt",
          size: 12,
          updatedAt: "2026-10-19T05:24:31Z",
          url: "https://github.com/wxx9248/PC-Fan-Controller/releases/download/v1.0.0/notes.txt"
        }
      ],
      htmlUrl: releaseUrl
    });
  });

  it("sends the API headers, and the token only when given", async () => {
    const anonymous = fakeFetch({ [apiUrl]: () => jsonResponse(apiRelease) });
    await new GitHubClient({ fetch: anonymous.fetch }).latestRelease(repo);
    const authorised = fakeFetch({ [apiUrl]: () => jsonResponse(apiRelease) });
    await new GitHubClient({
      fetch: authorised.fetch,
      token: "s3cret"
    }).latestRelease(repo);

    const [plain] = anonymous.requests;
    const [withToken] = authorised.requests;
    expect(plain?.headers.get("Accept")).toBe("application/vnd.github+json");
    expect(plain?.headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(plain?.headers.has("Authorization")).toBe(false);
    expect(withToken?.headers.get("Authorization")).toBe("Bearer s3cret");
  });

  it("names the repo and status on a 403", async () => {
    const { fetch } = fakeFetch({
      [apiUrl]: () => jsonResponse({ message: "rate limited" }, 403)
    });

    const failure = new GitHubClient({ fetch }).latestRelease(repo);

    await expect(failure).rejects.toThrow(repo);
    await expect(failure).rejects.toThrow("403");
  });

  it("says the repo has no release on a 404", async () => {
    const { fetch } = fakeFetch({
      [apiUrl]: () => jsonResponse({ message: "Not Found" }, 404)
    });

    const failure = new GitHubClient({ fetch }).latestRelease(repo);

    await expect(failure).rejects.toThrow(`${repo} has no release`);
  });
});

describe("selectAssets", () => {
  const release: Release = {
    assets: [
      {
        digest: debDigest,
        name: "fan-controllerd_1.0.0_arm64.deb",
        size: 1,
        updatedAt: "2026-10-19T05:24:30Z",
        url: "https://example.test/arm64.deb"
      },
      {
        digest: null,
        name: "notes.txt",
        size: 1,
        updatedAt: "2026-10-19T05:24:30Z",
        url: "https://example.test/notes.txt"
      }
    ],
    htmlUrl: releaseUrl
  };

  it("keeps only matching names", () => {
    const selected = selectAssets(release, /\.deb$/u);

    expect(selected.map((asset) => asset.name)).toEqual([
      "fan-controllerd_1.0.0_arm64.deb"
    ]);
  });

  it("throws naming the pattern and release URL when nothing matches", () => {
    const select = (): unknown => selectAssets(release, /\.rpm$/u);

    expect(select).toThrow("/\\.rpm$/u");
    expect(select).toThrow(releaseUrl);
  });
});
