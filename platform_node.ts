import type {
  DirectoryContentsReaderOptions,
  DirectoryEntry,
  DirectoryEntryType,
  ReadBinaryFromFileOptions,
  ReadTextFromFileOptions,
} from "./interfaces.ts";
import * as fsPromises from "node:fs/promises";
import type { Dirent } from "node:fs";
import type { Abortable } from "node:events";
import type { Platform } from "./platform.ts";

async function direntToType(
  dirent: Dirent,
  direntUrl: URL,
  options?: DirectoryContentsReaderOptions,
): Promise<DirectoryEntryType> {
  if (dirent.isSymbolicLink() && options?.includeSymlinks) {
    try {
      const info = await fsPromises.stat(direntUrl);
      return info.isFile()
        ? "file"
        : info.isDirectory()
        ? "directory"
        : "other";
    } catch (e) {
      // Symbolic links to files/directories that don't exist are treated as "other".
      if (e instanceof Error && (e as { code?: string })?.code === "ENOENT") {
        return "other";
      }
      throw e;
    }
  }

  return dirent.isFile()
    ? "file"
    : dirent.isDirectory()
    ? "directory"
    : "other";
}

function nodeLoadTextFromFile(
  path: URL,
  options?: ReadTextFromFileOptions,
): Promise<string> {
  return fsPromises.readFile(path, {
    encoding: "utf-8",
    signal: (options as Abortable | undefined)?.signal,
  });
}

function nodeLoadBinaryFromFile(
  path: URL,
  options?: ReadBinaryFromFileOptions,
): Promise<Uint8Array> {
  return fsPromises.readFile(path, {
    encoding: null,
    signal: (options as Abortable | undefined)?.signal,
  }) as unknown as Promise<Uint8Array>;
}

async function nodeLoadDirectoryContents(
  path: URL,
  options?: DirectoryContentsReaderOptions,
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const nodeEntries = await fsPromises.readdir(path, { withFileTypes: true });

  const pathWithSlash = new URL(path.href + "/");

  for (const dirent of nodeEntries) {
    options?.signal?.throwIfAborted();
    const direntUrl = new URL(dirent.name, pathWithSlash);

    entries.push({
      name: dirent.name,
      type: await direntToType(dirent, direntUrl, options),
      url: direntUrl,
    });
  }

  return entries;
}

export function makeNodePlatform(): Platform {
  return Object.freeze({
    fileReader: {
      name: "fs.readFile",
      readTextFromFile: nodeLoadTextFromFile,
      readBinaryFromFile: nodeLoadBinaryFromFile,
    },
    directoryContentsReader: {
      name: "fs.readdir",
      loadDirectoryContents: nodeLoadDirectoryContents,
    },
  });
}
