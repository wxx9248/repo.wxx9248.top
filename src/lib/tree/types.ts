export const ENTRY_KINDS = ["file", "folder", "symlink"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export function isEntryKind(value: unknown): value is EntryKind {
  return ENTRY_KINDS.some((kind) => kind === value);
}

// Folders have size 0.
// Symlinks carry the size and mtime of their target.
// For symlinks, `target` holds the readlink text.
export interface Entry {
  kind: EntryKind;
  mtimeMs: number;
  name: string;
  size: number;
  target?: string;
}

// The root folder has an empty path.
export interface Folder {
  entries: Entry[];
  mtimeMs: number;
  path: string[];
}
