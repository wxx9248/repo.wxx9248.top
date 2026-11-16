export interface ReleaseAsset {
  digest: string | null;
  name: string;
  size: number;
  updatedAt: string;
  url: string;
}

export interface Release {
  assets: ReleaseAsset[];
  htmlUrl: string;
}

export type Fetch = typeof fetch;

interface ApiAsset {
  browser_download_url: string;
  digest: string | null;
  name: string;
  size: number;
  updated_at: string;
}

interface ApiRelease {
  assets: ApiAsset[];
  html_url: string;
}

const apiBase = "https://api.github.com";
// The REST API version these response shapes were written against
const apiVersion = "2022-11-28";
const notFound = 404;

export interface GitHubClientOptions {
  fetch?: Fetch;
  // Raises the API rate limit; anonymous requests work too
  token?: string;
}

// Reads releases through the GitHub REST API
export class GitHubClient {
  readonly #fetch: Fetch;
  readonly #token: string | undefined;

  constructor(options: GitHubClientOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#token = options.token;
  }

  async latestRelease(github: string): Promise<Release> {
    const response = await this.#fetch(
      `${apiBase}/repos/${github}/releases/latest`,
      { headers: this.#headers() }
    );
    if (response.status === notFound) {
      throw new Error(`${github} has no release`);
    }
    if (!response.ok) {
      throw new Error(
        `GitHub API request for ${github} failed with status ${response.status}`
      );
    }
    return toRelease((await response.json()) as ApiRelease);
  }

  #headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": apiVersion
    };
    if (this.#token) {
      headers.Authorization = `Bearer ${this.#token}`;
    }
    return headers;
  }
}

function toRelease(release: ApiRelease): Release {
  return {
    assets: release.assets.map((asset) => ({
      digest: asset.digest,
      name: asset.name,
      size: asset.size,
      updatedAt: asset.updated_at,
      url: asset.browser_download_url
    })),
    htmlUrl: release.html_url
  };
}

export function selectAssets(
  release: Release,
  pattern: RegExp
): ReleaseAsset[] {
  const selected = release.assets.filter((asset) => pattern.test(asset.name));
  if (selected.length) {
    return selected;
  }
  throw new Error(
    `No asset in ${release.htmlUrl} matches ${pattern.toString()}`
  );
}
