import type { Entry } from "@/lib/tree/types";

/*
 * Percent-escapes of the sub-delimiters and ":" and "@", which RFC 3986 allows
 * literally in a path segment. Servers differ on decoding %3A and %2B, but
 * all of them resolve the literal characters the same way.
 */
const LEGAL_IN_SEGMENT = /%(?:2B|3A|40|24|26|2C|3B|3D)/giu;

function encodeSegment(name: string): string {
  return encodeURIComponent(name).replace(LEGAL_IN_SEGMENT, (escape) =>
    decodeURIComponent(escape)
  );
}

export function entryHref(entry: Pick<Entry, "kind" | "name">): string {
  const suffix = entry.kind === "folder" ? "/" : "";
  return `./${encodeSegment(entry.name)}${suffix}`;
}

export function folderUrl(path: string[]): string {
  return `/${path.map((segment) => `${encodeSegment(segment)}/`).join("")}`;
}
