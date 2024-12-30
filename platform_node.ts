import type {
  DirectoryContents,
  DirectoryEntry,
  DirectoryEntryType,
  ReadBinaryFromFileOptions,
  ReadDirectoryContentsOptions,
  ReadTextFromFileOptions,
} from "./interfaces.ts";
import * as fsPromises from "node:fs/promises";
import type { Dirent } from "node:fs";
import type { Abortable } from "node:events";
import type { Platform } from "./platform.ts";

async function direntToType(
  dirent: Dirent,
  direntUrl: URL,
  options?: ReadDirectoryContentsOptions,
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

function nodeReadTextFromFile(
  path: URL,
  options?: ReadTextFromFileOptions,
): Promise<string> {
  // We need to do this because Bun seems not to reliably honor the "signal" option.
  if (options?.signal?.aborted) {
    return Promise.reject(options.signal.reason);
  }

  return fsPromises.readFile(path, {
    encoding: "utf-8",
    signal: (options as Abortable | undefined)?.signal,
  });
}

async function nodeReadBinaryFromFile(
  path: URL,
  options?: ReadBinaryFromFileOptions,
): Promise<Uint8Array> {
  const buffer = await fsPromises.readFile(path, {
    encoding: null,
    signal: (options as Abortable | undefined)?.signal,
  });

  // Because, despite the superficial compatibility, Node.js' `Buffer` type is not fully
  // compatible with `Uint8Array` (notably the `slice` method).
  // See https://nodejs.org/api/buffer.html#buffers-and-typedarrays for some of the incompatibilities.
  return new Uint8Array(buffer);
}

async function nodeReadDirectoryContents(
  path: URL,
  options?: ReadDirectoryContentsOptions,
): Promise<DirectoryContents> {
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

  return { entries };
}

export function makeNodePlatform(): Platform {
  return Object.freeze({
    fileSystemReader: {
      name: "Node.js file system reader",
      readTextFromFile: nodeReadTextFromFile,
      readBinaryFromFile: nodeReadBinaryFromFile,
      readDirectoryContents: nodeReadDirectoryContents,
    },
  });
}
