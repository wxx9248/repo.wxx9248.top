import type { Entry } from "@/lib/tree/types";
import { formatSize } from "@/lib/format/size";

const NONE = 0;
const SINGULAR = 1;

function count(total: number, noun: string): string {
  return `${total} ${noun}${total === SINGULAR ? "" : "s"}`;
}

// Symlinks count as files, but their size is not added to the total.
export function summarize(entries: Entry[]): string {
  const folders = entries.filter((entry) => entry.kind === "folder").length;
  const files = entries.length - folders;
  const parts: string[] = [];
  if (folders > NONE) {
    parts.push(count(folders, "folder"));
  }
  if (files > NONE) {
    parts.push(count(files, "file"));
  }
  if (parts.length === NONE) {
    return "empty";
  }
  const names = parts.join(", ");
  if (files === NONE) {
    return names;
  }
  const bytes = entries
    .filter((entry) => entry.kind === "file")
    .reduce((sum, entry) => sum + entry.size, NONE);
  return `${names} · ${formatSize(bytes)}`;
}
