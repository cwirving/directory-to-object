import type {
  DirectoryContentsReaderOptions,
  DirectoryEntry,
  DirectoryEntryType,
  FileTextLoaderOptions,
  Platform,
} from "./interfaces.ts";
import * as fsPromises from "node:fs/promises";
import type { Dirent } from "node:fs";
import type { Abortable } from "node:events";

async function direntToType(
  dirent: Dirent,
  direntUrl: URL,
  options?: DirectoryContentsReaderOptions,
): Promise<DirectoryEntryType> {
  if (dirent.isSymbolicLink() && options?.includeSymlinks) {
    const info = await fsPromises.stat(direntUrl);
    return info.isFile() ? "file" : info.isDirectory() ? "directory" : "other";
  }

  return dirent.isFile()
    ? "file"
    : dirent.isDirectory()
    ? "directory"
    : "other";
}

function nodeLoadTextFromFile(
  path: URL,
  options?: FileTextLoaderOptions,
): Promise<string> {
  return fsPromises.readFile(path, {
    encoding: "utf-8",
    signal: (options as Abortable | undefined)?.signal,
  });
}

async function nodeLoadDirectoryContents(
  path: URL,
  options?: DirectoryContentsReaderOptions,
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const nodeEntries = await fsPromises.readdir(path, { withFileTypes: true });

  for (const dirent of nodeEntries) {
    const direntUrl = new URL(dirent.name, path);

    entries.push({
      name: dirent.name,
      type: await direntToType(dirent, direntUrl, options),
      url: direntUrl,
    });
  }

  return entries;
}

export const platform: Platform = Object.freeze({
  fileTextLoader: {
    name: "fs.readFile",
    loadTextFromFile: nodeLoadTextFromFile,
  },
  directoryContentsReader: {
    name: "fs.readdir",
    loadDirectoryContents: nodeLoadDirectoryContents,
  },
});
