import type { Entry } from "@/lib/tree/types";

export const SORT_KEYS = ["mtime", "name", "size"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "ascending" | "descending";

export function isSortKey(value: unknown): value is SortKey {
  return SORT_KEYS.some((key) => key === value);
}

// A column starts newest-first and largest-first, and A to Z for names
export function defaultDirection(key: SortKey): SortDirection {
  return key === "name" ? "ascending" : "descending";
}

type Sortable = Pick<Entry, "kind" | "mtimeMs" | "name" | "size">;

const BEFORE = -1;
const AFTER = 1;
const EQUAL = 0;

// Plain code-point comparison, so Node and every browser agree
function compareNames(a: string, b: string): number {
  if (a < b) {
    return BEFORE;
  }
  return a > b ? AFTER : EQUAL;
}

function compareByKey(a: Sortable, b: Sortable, key: SortKey): number {
  switch (key) {
    case "mtime":
      return a.mtimeMs - b.mtimeMs;
    case "name":
      return compareNames(a.name, b.name);
    case "size":
      return a.size - b.size;
    default:
      return EQUAL;
  }
}

// Folders come first in both directions.
// Ties on size or mtime fall back to name ascending in both directions.
export function compareEntries(
  a: Sortable,
  b: Sortable,
  key: SortKey,
  direction: SortDirection
): number {
  const aIsFolder = a.kind === "folder";
  if (aIsFolder !== (b.kind === "folder")) {
    return aIsFolder ? BEFORE : AFTER;
  }
  const keyed = compareByKey(a, b, key);
  if (keyed === EQUAL) {
    return compareNames(a.name, b.name);
  }
  return direction === "ascending" ? keyed : -keyed;
}

export function sortEntries<T extends Sortable>(
  entries: T[],
  key: SortKey = "name",
  direction: SortDirection = "ascending"
): T[] {
  return [...entries].sort((a, b) => compareEntries(a, b, key, direction));
}
