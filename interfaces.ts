/**
 * Our own equivalent to the Node.js `Abortable` interface. Unfortunately, the Deno and Node.js
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
 * Options passed to the {@link FileReader} {@linkcode FileReader.readTextFromFile | readTextFromFile} method.
 */
export interface ReadTextFromFileOptions extends WithOptionalSignal {
}

/**
 * Options passed to the {@link FileReader} {@linkcode FileReader.readBinaryFromFile | readBinaryFromFile} method.
 */
export interface ReadBinaryFromFileOptions extends WithOptionalSignal {
}

/**
 * Interface of a reader that can read text files into strings and binary files into `Uint8Array`s..
 */
export interface FileReader {
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
    options?: Readonly<ReadTextFromFileOptions>,
  ): Promise<string>;

  /**
   * Asynchronously read the contents of a file identified by its URL into a `Uint8Array`.
   *
   * @param path The URL of the file to read.
   * @param options Options to apply to the reader.
   * @returns A promise to the contents of the file as a `Uint8Array`.
   */
  readBinaryFromFile(
    path: URL,
    options?: Readonly<ReadBinaryFromFileOptions>,
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
  name: string;

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
   * @returns A promise to an array of **mutable** objects implementing the {@link DirectoryEntry} interface, each representing a file/directory in the directory.
   */
  loadDirectoryContents(
    path: URL,
    options?: Readonly<DirectoryContentsReaderOptions>,
  ): Promise<DirectoryEntry[]>;
}

/**
 * Options passed to the {@link ValueLoader} {@linkcode ValueLoader.loadValue | loadValue} method when the loader is
 * a file-based loader.
 */
export interface FileValueLoaderOptions
  extends ReadTextFromFileOptions, ReadBinaryFromFileOptions {
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

/**
 * The signature of a merge function used by the directory object loader to merge array and
 * plain JavaScript object values in loaded objects.
 *
 * The merge function may or may not have side effects for either existing or new values, but only
 * the function return value will be assigned by the caller.
 *
 * @param existingValue The existing value found in the target object.
 * @param newValue The newly-loaded value to merge with the existing value.
 * @returns The merged value to assign in the target object.
 */
export type MergeFn<TValue> = (
  existingValue: TValue,
  newValue: TValue,
) => TValue;

/**
 * Options passed to the {@link ValueLoader} {@linkcode DirectoryObjectLoader.loadObjectFromDirectory | loadValueFromFile} method.
 */
export interface ValueLoaderOptions
  extends FileValueLoaderOptions, DirectoryContentsReaderOptions {
  /**
   * The merge function that will be used to merge array values in loaded objects.
   * This is only called when both existing and new values are arrays.
   * If unspecified, the default is to use the new array (i.e., to always overwrite the
   * existing array).
   */
  arrayMergeFunction?: MergeFn<unknown[]>;

  /**
   * The merge function that will be used to merge plain object values in loaded objects.
   * This is only called when both existing and new values are plain objects.
   * If unspecified, the default is to use the new object (i.e., to always overwrite the
   * existing object).
   */
  objectMergeFunction?: MergeFn<Record<string, unknown>>;

  /**
   * If set, the URL of each directory visited will be embedded in the resulting plain JavaScript object as the
   * property with this name. The value of the property will be the exact `URL` object used to read the directory.
   */
  embedDirectoryUrlAs?: string;

  /**
   * If set, the URL of each file with structured contents visited will be embedded in the resulting plain JavaScript
   * object as the property with this name. The value of the property will be the exact `URL` object used to read the
   * file.
   */
  embedFileUrlAs?: string;

  /**
   * If specified, file and directory names will be passed through this decoding function before using them to create
   * properties in the object. This allows properties to have names that would be forbidden by the file system
   * (e.g., "/"): define a file name encoding convention and decode it via this option.
   *
   * By default, there is no decoding of names.
   *
   * @param name The name of the file or directory being read.
   * @returns The decoded name of the corresponding property to create/update.
   */
  propertyNameDecoder?: (name: string) => string;

  /**
   * If true, the directory value loader will reject with an error when there are directory entries that have not been
   * handled by a loader.
   */
  strict?: boolean;
}

/**
 * Extension of {@linkcode DirectoryEntry} to include contextual information (the relative path within the overall
 * directory structure where this entry can be found).
 */
export interface DirectoryEntryInContext extends DirectoryEntry {
  /**
   * The path, relative to the root of the directory structure being loaded of this entry. Note that this is the
   * traversal path starting at the root, not the actual file system path -- if the underlying storage is not a
   * traditional file system (e.g., hyperlinked documents on the web), there may be no relationship between the
   * paths of various file/directory URLs in the structure.
   */
  relativePath: string;
}

/**
 * Interface of a value loader.
 *
 * TODO: fix this documentation
 * Directory object loaders read the contents of a directory specified by its URL into a plain JavasScript object.
 * The exact behavior depends on the loader, but the standard behavior implemented in this library is to
 * list directory contents, use registered file value loaders to load the individual files in the directory and
 * recurse into subdirectories.
 *
 * When there are multiple files with the same base name (resulting in the same property name), their values are
 * merged if possible (they are both plain JavaScript objects or arrays and the corresponding merge function was
 * provided in the options) or one overwrites the other if not. There is no ordering promise in either (merge or
 * overwrite) case.
 */
export interface ValueLoader<TValue> {
  /**
   * The name of the loader. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Synchronously or asynchronously determine if this loader can handle the specified file/directory.
   *
   * @param entry The directory entry in context describing the file/directory.
   * @returns `true` or a promise that resolved to `true` if this loader can handle the file/directory at the source URL.
   */
  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean>;

  /**
   * Compute the key where the file/directory value should be located in the resulting JavaScript object.
   *
   * @param entry The directory entry in context describing the file/directory.
   * @returns The key where the loaded value should be located in the resulting object or `undefined` if the value should not be requested or stored (i.e., this entry should be considered as handled but ignored).
   */
  computeKey(entry: DirectoryEntryInContext): string | undefined;

  /**
   * Asynchronously load the value of a file or directory.
   *
   * @param entry The directory entry in context describing the file/directory.
   * @param options Options to pass to the directory reader, file loaders and file readers used during the operation.
   * @returns A promise to a plain JavaScript object representing the directory contents.
   */
  loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue>;
}

export interface FluentLoader<TValue> extends ValueLoader<TValue> {
  /**
   * Convenience wrapper around the {@linkcode loadValue} method that takes a directory URL as input and takes care
   * of the boilerplate to call {@linkcode canLoadValue} and {@linkcode loadValue} on the value loader.
   *
   * **Note:** The fact that this method is present does not mean that the loader is actually able to load directories.
   * If it cannot load the directory, this method will reject with an error.
   *
   * @param directoryUrl - The URL of the directory to be loaded.
   * @param options - Optional configuration for loading and processing the directory contents.
   * @returns A promise that resolves to the loaded and processed value.
   */
  loadDirectory(
    directoryUrl: URL,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue>;

  /**
   * Convenience wrapper around the {@linkcode loadValue} method that takes a file URL as input and takes care
   * of the boilerplate to call {@linkcode canLoadValue} and {@linkcode loadValue} on the value loader.
   *
   * **Note:** The fact that this method is present does not mean that the loader is actually able to load files.
   * If it cannot load the file, this method will reject with an error.
   *
   * @param fileUrl - The URL of the file to be loaded.
   * @param options - Optional configuration for loading the file contents.
   * @returns A promise that resolves to the loaded value.
   */
  loadFile(
    fileUrl: URL,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue>;
}

export interface FileLoaderBuildOptions {
  extension?: string;
  name?: string;
}

/**
 * The signature expected of string parser functions passed to the {@linkcode LoaderBuilder.customFile} method.
 */
export type StringParserFunc = (input: string) => unknown;

export type CanLoadValueFunc = (
  entry: DirectoryEntryInContext,
) => boolean | Promise<boolean>;

export interface CustomFileLoaderBuildOptions extends FileLoaderBuildOptions {
  parser: StringParserFunc;
  canLoadValue?: CanLoadValueFunc;
}

export interface DirectoryLoaderBuildOptions {
  name?: string;
  loaders: Iterable<ValueLoader<unknown>>;
  defaultOptions?: Readonly<ValueLoaderOptions>;
}

export interface LoaderBuilder {
  textFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<string>;
  binaryFile(
    options?: Readonly<FileLoaderBuildOptions>,
  ): FluentLoader<Uint8Array>;
  jsonFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<unknown>;
  customFile(
    options?: Readonly<CustomFileLoaderBuildOptions>,
  ): FluentLoader<unknown>;
  directoryAsObject(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<Record<string, unknown>>;
  directoryAsArray(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<unknown[]>;
  defaults(): FluentLoader<unknown>[];
}
