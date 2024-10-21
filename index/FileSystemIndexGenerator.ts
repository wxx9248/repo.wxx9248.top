import { Command } from "commander";
import type { File, Folder } from "common/FileSystem";
import { readdir, stat, writeFile } from "fs/promises";
import { resolve } from "path";

async function walk(folder: string): Promise<Folder> {
  const folderEntries: Record<string, Folder> = {};
  const fileEntries: Record<string, File> = {};

  const entries = await readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(folder, entry.name);

    if (entry.isDirectory()) {
      folderEntries[entry.name] = await walk(entryPath);
    } else if (entry.isFile()) {
      const fileStats = await stat(entryPath);
      fileEntries[entry.name] = {
        size: fileStats.size
      };
    }
  }

  return {
    folderEntries,
    fileEntries
  };
}

async function main(folderPath: string, outputPath: string): Promise<void> {
  const root = await walk(folderPath);
  const content = `export const index = ${JSON.stringify(root, null, 2)}`;
  await writeFile(outputPath, content, { encoding: "utf8" });
}

const command = new Command();
command.arguments("<folder>", "Path to folder");
command.arguments("<output>", "Path to output index file");
command.action(main);
command.parse(process.argv);
