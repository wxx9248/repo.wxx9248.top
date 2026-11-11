import type { Entry } from "@/lib/tree/types";

export function entryHref(entry: Pick<Entry, "kind" | "name">): string {
  const suffix = entry.kind === "folder" ? "/" : "";
  return `./${encodeURIComponent(entry.name)}${suffix}`;
}

export function folderUrl(path: string[]): string {
  return `/${path.map((segment) => `${encodeURIComponent(segment)}/`).join("")}`;
}
