/**
 * Our own equivalent to the Node.js `Abortable` type. Unfortunately, the Deno and Node.js
 * `AbortSignal` types aren't completely identical, so using `Abortable` directly causes
 * type checking issues.
 */
export interface WithOptionalSignal {
  /**
   * A signal checked during reading/loading operations to cancel them (e.g., based on a timeout).
   */
  signal?: AbortSignal;
}

/**
 * Options passed to the {@link FileTextReader} {@linkcode FileTextReader.readTextFromFile | readTextFromFile} method.
 */
export interface FileTextReaderOptions extends WithOptionalSignal {
}

/**
 * Interface of a reader that can read text files into strings.
 */
export interface FileTextReader {
  /**
   * The name of the reader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously read the contents of a file identified by its URL into a string.
   *
   * @param path The URL of the file to read.
   * @param options Options to apply to the reader.
   * @returns A promise to the contents of the file as a string.
   */
  readTextFromFile(
    path: URL,
    options?: Readonly<FileTextReaderOptions>,
  ): Promise<string>;
}

/**
 * Options passed to the {@link FileBinaryReader} {@linkcode FileBinaryReader.readBinaryFromFile | readBinaryFromFile} method.
 */
export interface FileBinaryReaderOptions extends WithOptionalSignal {
}

/**
 * Interface of a reader that can read binary files into `Uint8Array`s.
 */
export interface FileBinaryReader {
  /**
   * The name of the reader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously read the contents of a file identified by its URL into a `Uint8Array`.
   *
   * @param path The URL of the file to read.
   * @param options Options to apply to the reader.
   * @returns A promise to the contents of the file as a `Uint8Array`.
   */
  readBinaryFromFile(
    path: URL,
    options?: Readonly<FileTextReaderOptions>,
  ): Promise<Uint8Array>;
}

/**
 * The type of directory entry returned by a {@link DirectoryContentsReader}.
 *
 * This is a simplification of what is possible in the file system to only cover the cases
 * relevant to this library, namely files, directories and everything else.
 */
export type DirectoryEntryType = "file" | "directory" | "other";

/**
 * Interface of each directory entry returned by the {@link DirectoryContentsReader} {@linkcode DirectoryContentsReader.loadDirectoryContents | loadDirectoryContents} method.
 */
export interface DirectoryEntry {
  /**
   * The name of the directory entry, without any path, but with its extension.
   */
  readonly name: string;

  /**
   * The type of the directory entry -- "file", "directory" or "other".
   */
  type: DirectoryEntryType;

  /**
   * The URL of the directory entry. This can be used to fetch the directory using a suitable reader.
   */
  url: URL;
}

/**
 * Options passed to the {@link DirectoryContentsReader} {@linkcode DirectoryContentsReader.loadDirectoryContents | loadDirectoryContents} method.
 */
export interface DirectoryContentsReaderOptions extends WithOptionalSignal {
  /**
   * If `true`, the directory reader considers symbolic links as actual files and directories
   * (based on the destination of the link). If `false` (the default), links are treated as
   * having a type of "other".
   *
   * The default is `false` to avoid needlessly putting a loader at risk with malformed (e.g., circular) links,
   * when they are unusual in a configuration context.
   */
  includeSymlinks?: boolean;
}

/**
 * Interface of a directory contents reader, that can asynchronously read the contents of a directory
 * and return it as an array of objects implementing the {@link DirectoryEntry} interface.
 */
export interface DirectoryContentsReader {
  /**
   * The name of the reader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously read a directory's contents and return it as an array of objects implementing
   * the {@link DirectoryEntry} interface.
   *
   * @param path The URL of the directory to read.
   * @param options Options to apply to the reader.
   * @returns A promise to an array of objects implementing the {@link DirectoryEntry} interface, each representing a file in the directory.
   */
  loadDirectoryContents(
    path: URL,
    options?: Readonly<DirectoryContentsReaderOptions>,
  ): Promise<DirectoryEntry[]>;
}

/**
 * Options passed to the {@link FileValueLoader} {@linkcode FileValueLoader.loadValueFromFile | loadValueFromFile} method.
 */
export interface FileValueLoaderOptions extends FileTextReaderOptions {
}

/**
 * Interface of a file value loader.
 *
 * File value loaders, as opposed to _readers_ encapsulate reading files **and** their
 * interpretation as a given format. For example, a file value loader may read a file as text and
 * parse the text as JSON, producing a JavaScript primitive value.
 *
 * While this library only contains loaders for plain text, binary data and JSON files, consumers
 * can create their own loaders for any format they choose and represent the loaded result as any
 * JavaScript value.
 */
export interface FileValueLoader {
  /**
   * The name of the loader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously load (read and parse) the file at the specified URL. The exact parsing
   * depends on the implementation.
   *
   * @param path The URL of the file to load.
   * @param options Options governing the behavior of the loader.
   * @returns A promise to a JavaScript value. There are no magic values, any value including `undefined` is valid.
   */
  loadValueFromFile(
    path: URL,
    options?: Readonly<FileValueLoaderOptions>,
  ): Promise<unknown>;
}

/**
 * Options passed to the {@link DirectoryObjectLoader} {@linkcode DirectoryObjectLoader.loadObjectFromDirectory | loadValueFromFile} method.
 */
export interface DirectoryObjectLoaderOptions
  extends FileValueLoaderOptions, DirectoryContentsReaderOptions {
}

/**
 * Interface of a directory object loader.
 *
 * Directory object loaders read the contents of a directory specified by its URL into a plain JavasScript object.
 * The exact behavior depends on the loader, but the standard behavior implemented in this library is to
 * list directory contents, use registered file value loaders to load the individual files in the directory and
 * recurse into subdirectories.
 *
 * When there are multiple files with the same base name (resulting in the same property name), their values are
 * merged if possible (they are both plain JavaScript objects) or one overwrites the other if not. There is no
 * ordering promise in either (merge or overwrite) case.
 */
export interface DirectoryObjectLoader {
  /**
   * The name of the loader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously load a directory as a plain JavaScript object.
   *
   * @param path The URL of the directory to load.
   * @param options Options to pass to the directory reader, file loaders and file readers used during the operation.
   * @returns A promise to a plain JavaScript object representing the directory contents.
   */
  loadObjectFromDirectory(
    path: URL,
    options?: Readonly<DirectoryObjectLoaderOptions>,
  ): Promise<Record<string, unknown>>;
}
