export interface File {
  size: number;
}

export interface Folder {
  folderEntries: Record<string, Folder>;
  fileEntries: Record<string, File>;
}
