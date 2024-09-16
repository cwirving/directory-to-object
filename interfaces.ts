/**
 * Our own equivalent to the Node.JS `Abortable` type. Unfortunately, the Deno and Node.JS
 * `AbortSignal` types aren't completely identical, so using `Abortable` causes type checking issues.
 */
export interface WithOptionalSignal {
  signal?: AbortSignal;
}

export interface FileTextLoaderOptions extends WithOptionalSignal {
}

export interface FileTextLoader {
  name: string;
  loadTextFromFile(
    path: URL,
    options?: FileTextLoaderOptions,
  ): Promise<string>;
}

export interface FileBinaryLoaderOptions extends WithOptionalSignal {
}

export interface FileBinaryLoader {
  name: string;
  loadBinaryFromFile(
    path: URL,
    options?: FileTextLoaderOptions,
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

export interface FileValueLoaderOptions extends FileTextLoaderOptions {
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

export interface Platform {
  fileTextLoader: FileTextLoader;
  fileBinaryLoader: FileBinaryLoader;
  directoryContentsReader: DirectoryContentsReader;
}
