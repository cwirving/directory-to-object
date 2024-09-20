/**
 * Our own equivalent to the Node.js `Abortable` type. Unfortunately, the Deno and Node.js
 * `AbortSignal` types aren't completely identical, so using `Abortable` causes type checking issues.
 */
export interface WithOptionalSignal {
  signal?: AbortSignal;
}

export interface FileTextReaderOptions extends WithOptionalSignal {
}

export interface FileTextReader {
  name: string;
  readTextFromFile(
    path: URL,
    options?: FileTextReaderOptions,
  ): Promise<string>;
}

export interface FileBinaryReaderOptions extends WithOptionalSignal {
}

export interface FileBinaryReader {
  name: string;
  readBinaryFromFile(
    path: URL,
    options?: FileTextReaderOptions,
  ): Promise<Uint8Array>;
}

export type DirectoryEntryType = "file" | "directory" | "other";

export interface DirectoryEntry {
  name: string;
  type: DirectoryEntryType;
  url: URL;
}

export interface DirectoryContentsReaderOptions extends WithOptionalSignal {
  includeSymlinks?: boolean;
}

export interface DirectoryContentsReader {
  name: string;
  loadDirectoryContents(
    path: URL,
    options?: DirectoryContentsReaderOptions,
  ): Promise<DirectoryEntry[]>;
}

export interface Platform {
  fileTextReader: FileTextReader;
  fileBinaryReader: FileBinaryReader;
  directoryContentsReader: DirectoryContentsReader;
}

export interface FileValueLoaderOptions extends FileTextReaderOptions {
}

export interface FileValueLoader {
  name: string;
  loadValueFromFile(
    path: URL,
    options?: FileValueLoaderOptions,
  ): Promise<unknown>;
}

export interface DirectoryObjectLoaderOptions
  extends FileValueLoaderOptions, DirectoryContentsReaderOptions {
}

export interface DirectoryObjectLoader {
  loadObjectFromDirectory(
    path: URL,
    options?: DirectoryObjectLoaderOptions,
  ): Promise<Record<string, unknown>>;
}
