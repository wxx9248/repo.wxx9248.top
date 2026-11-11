export type EntryKind = "file" | "folder" | "symlink";

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
