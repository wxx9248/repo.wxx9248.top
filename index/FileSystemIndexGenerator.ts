import { Command } from "commander";
import type { Folder, File } from "common/FileSystem";
import { readdir, stat, writeFile } from "fs/promises";
import { resolve, basename } from "path";

async function walk(folder: string): Promise<Folder> {
  const folderEntries: Folder[] = [];
  const fileEntries: File[] = [];

  const entries = await readdir(folder, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = resolve(folder, entry.name);

    if (entry.isDirectory()) {
      const subfolder = await walk(entryPath);
      folderEntries.push(subfolder);
    } else if (entry.isFile()) {
      const fileStats = await stat(entryPath);
      fileEntries.push({
        name: entry.name,
        size: fileStats.size
      });
    }
  }

  return {
    name: basename(folder),
    folderEntries,
    fileEntries
  };
}

async function main(folderPath: string, outputPath: string): Promise<void> {
  const folder = await walk(folderPath);
  folder.name = "/";
  const content = `export const index = ${JSON.stringify(folder, null, 2)}`;
  await writeFile(outputPath, content, { encoding: "utf8" });
}

const command = new Command();
command.arguments("<folder>", "Path to folder");
command.arguments("<output>", "Path to output index file");
command.action(main);
command.parse(process.argv);
