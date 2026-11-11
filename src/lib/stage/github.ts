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

const notFound = 404;

export async function fetchLatestRelease(
  github: string,
  options: { fetch?: Fetch; token?: string }
): Promise<Release> {
  const fetchImpl = options.fetch ?? fetch;
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const response = await fetchImpl(
    `https://api.github.com/repos/${github}/releases/latest`,
    { headers }
  );
  if (response.status === notFound) {
    throw new Error(`${github} has no release`);
  }
  if (!response.ok) {
    throw new Error(
      `GitHub API request for ${github} failed with status ${response.status}`
    );
  }
  const release = (await response.json()) as ApiRelease;
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
