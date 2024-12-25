import type {
  DirectoryEntry,
  DirectoryEntryType,
  ReadBinaryFromFileOptions,
  ReadDirectoryContentsOptions,
  ReadTextFromFileOptions,
} from "./interfaces.ts";
import type { Platform } from "./platform.ts";

async function dirEntryToType(
  dirEntry: Deno.DirEntry,
  direEntryUrl: URL,
  options?: ReadDirectoryContentsOptions,
): Promise<DirectoryEntryType> {
  // Handle symlinks specially.
  if (dirEntry.isSymlink && options?.includeSymlinks) {
    // Get details about the destination of the symlink (if it exists), not the link itself.
    try {
      const info = await Deno.stat(direEntryUrl);
      return info.isFile ? "file" : info.isDirectory ? "directory" : "other";
    } catch (e) {
      // Symbolic links to files/directories that don't exist are treated as "other".
      if (e instanceof Deno.errors.NotFound) return "other";
      throw e;
    }
  }

  // Not a symlink.
  return dirEntry.isFile
    ? "file"
    : dirEntry.isDirectory
    ? "directory"
    : "other";
}

function denoReadTextFromFile(
  path: URL,
  options?: ReadTextFromFileOptions,
): Promise<string> {
  return Deno.readTextFile(path, options);
}

function denoReadBinaryFromFile(
  path: URL,
  options?: ReadBinaryFromFileOptions,
): Promise<Uint8Array> {
  return Deno.readFile(path, options);
}

async function denoReadDirectoryContents(
  path: URL,
  options?: ReadDirectoryContentsOptions,
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];

  const pathWithSlash = new URL(path.href + "/");

  for await (const dirEntry of Deno.readDir(path)) {
    options?.signal?.throwIfAborted();
    const entryUrl = new URL(dirEntry.name, pathWithSlash);

    entries.push({
      name: dirEntry.name,
      url: entryUrl,
      type: await dirEntryToType(dirEntry, entryUrl, options),
    });
  }
  return entries;
}

export function makeDenoPlatform(): Platform {
  return Object.freeze({
    fileSystemReader: {
      name: "Deno file system reader",
      readTextFromFile: denoReadTextFromFile,
      readBinaryFromFile: denoReadBinaryFromFile,
      readDirectoryContents: denoReadDirectoryContents,
    },
  });
}
