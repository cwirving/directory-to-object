import type {
  DirectoryContentsReaderOptions,
  DirectoryEntry,
  DirectoryEntryType,
  FileBinaryReaderOptions,
  FileTextReaderOptions,
  Platform,
} from "./interfaces.ts";

async function dirEntryToType(
  dirEntry: Deno.DirEntry,
  direEntryUrl: URL,
  options?: DirectoryContentsReaderOptions,
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

function denoLoadTextFromFile(
  path: URL,
  options?: FileTextReaderOptions,
): Promise<string> {
  return Deno.readTextFile(path, options);
}

function denoLoadBinaryFromFile(
  path: URL,
  options?: FileBinaryReaderOptions,
): Promise<Uint8Array> {
  return Deno.readFile(path, options);
}

async function denoLoadDirectoryContents(
  path: URL,
  options?: DirectoryContentsReaderOptions,
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
    fileTextReader: {
      name: "Deno.readTextFile",
      readTextFromFile: denoLoadTextFromFile,
    },
    fileBinaryReader: {
      name: "Deno.readFile",
      readBinaryFromFile: denoLoadBinaryFromFile,
    },
    directoryContentsReader: {
      name: "Deno.readDir",
      loadDirectoryContents: denoLoadDirectoryContents,
    },
  });
}
