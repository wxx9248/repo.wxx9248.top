export interface Node {
  name: string;
}

export interface File extends Node {
  size: number;
}

export interface Folder extends Node {
  folderEntries: Folder[];
  fileEntries: File[];
}
