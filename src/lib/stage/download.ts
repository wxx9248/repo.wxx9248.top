import type { Fetch, ReleaseAsset } from "@/lib/stage/github";
import { mkdir, rename, rm, utimes } from "node:fs/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

// GitHub reports asset digests as "sha256:<hex>"
const digestAlgorithm = "sha256";
const digestPrefix = `${digestAlgorithm}:`;

export async function downloadAsset(
  asset: ReleaseAsset,
  directory: string,
  options: { fetch?: Fetch }
): Promise<string> {
  if (!asset.digest?.startsWith(digestPrefix)) {
    throw new Error(`Asset ${asset.name} has no digest to verify against`);
  }
  const expected = asset.digest.slice(digestPrefix.length);
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(asset.url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Downloading ${asset.name} from ${asset.url} failed with status ${response.status}`
    );
  }

  const path = join(directory, asset.name);
  const part = `${path}.part`;
  const hash = createHash(digestAlgorithm);
  await mkdir(directory, { recursive: true });
  try {
    await pipeline(
      Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
      async function* hashed(source: AsyncIterable<Buffer>) {
        for await (const chunk of source) {
          hash.update(chunk);
          yield chunk;
        }
      },
      createWriteStream(part)
    );
    const actual = hash.digest("hex");
    if (actual !== expected) {
      throw new Error(
        `Digest mismatch for ${asset.name}: expected ${expected}, got ${actual}`
      );
    }
    await rename(part, path);
  } catch (error) {
    await rm(part, { force: true });
    throw error;
  }
  const updated = new Date(asset.updatedAt);
  await utimes(path, updated, updated);
  return path;
}
