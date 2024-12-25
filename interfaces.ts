/**
 * The interfaces that underlie this library.
 *
 * The value loader interface that consumers generally work with is {@linkcode FluentLoader}, which enhances
 * the core {@linkcode ValueLoader} interface with fluent methods to build variations with additional
 * constraints.
 *
 * The options passed to functions in the library are also described as interfaces. The most frequently used is
 * {@linkcode ValueLoaderOptions}, which are the options passed to the
 * {@linkcode ValueLoader.loadValue} method to control the loading behavior (e.g., to map file names
 * to property names, control value merging behavior, etc.).
 *
 * The {@linkcode FileSystemReader} interfaces is a low-level abstractions over the underlying runtime platform's
 * file system functionality. Deno and Node.js/Bun have implementations built into the library, but it is possible
 * to write additional implementations over other file system-like media and use them with the library.
 *
 * @module
 */

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
 * Options passed to the {@link FileSystemReader} {@linkcode FileReader.readTextFromFile | readTextFromFile} method.
 */
export interface ReadTextFromFileOptions extends WithOptionalSignal {
}

/**
 * Options passed to the {@link FileSystemReader} {@linkcode FileReader.readBinaryFromFile | readBinaryFromFile} method.
 */
export interface ReadBinaryFromFileOptions extends WithOptionalSignal {
}

/**
 * The type of directory entry returned by a {@link FileSystemReader}.
 *
 * This is a simplification of what is possible in the file system to only cover the cases
 * relevant to this library, namely files, directories and everything else.
 */
export type DirectoryEntryType = "file" | "directory" | "other";

/**
 * Interface of each directory entry returned by the {@link FileSystemReader} {@linkcode FileSystemReader.loadDirectoryContents | loadDirectoryContents} method.
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
 * Options passed to the {@link FileSystemReader} {@linkcode FileSystemReader.loadDirectoryContents | loadDirectoryContents} method.
 */
export interface ReadDirectoryContentsOptions extends WithOptionalSignal {
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
 * Interface of a reader that can read files and list directory contents from the file system.
 */
export interface FileSystemReader {
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

  /**
   * Asynchronously read a directory's contents and return it as an array of objects implementing
   * the {@link DirectoryEntry} interface.
   *
   * @param path The URL of the directory to read.
   * @param options Options to apply to the reader.
   * @returns A promise to an array of **mutable** objects implementing the {@link DirectoryEntry} interface, each representing a file/directory in the directory. The directory loader may mutate both arrays and items as needed.
   */
  readDirectoryContents(
    path: URL,
    options?: Readonly<ReadDirectoryContentsOptions>,
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
  extends FileValueLoaderOptions, ReadDirectoryContentsOptions {
  /**
   * When specified, this file system reader overrides the file system reader that the loaders should use.
   * This allows consumers to build loaders using this library but use them with a completely different file system
   * implementation (e.g., to read the contents of an archive file instead of the platform file system).
   */
  fileSystemReader?: FileSystemReader;

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
 *
 * @typeParam The type of values loaded by this value loader. May be `unknown` if the loader could load values of any type.
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
   * Give the loader a name. Names are only for debugging purposes.
   *
   * @param name The new name to use.
   * @returns A new loader with the same behavior but with the new name.
   */
  withName(name: string): FluentLoader<TValue>;

  /**
   * Override the file system reader that the loader was initialized with and use the reader
   * provided instead. This behaves as if the new reader was passed in the `options` parameter to
   * {@linkcode ValueLoader.loadValue}, so it will also apply to any nested loaders.
   *
   * Additionally, any file system reader present in the `options` passed to {@linkcode ValueLoader.loadValue}
   * at runtime will be ignored -- this override takes priority.
   *
   * @param fileSystemReader
   */
  withFileSystemReader(
    fileSystemReader: FileSystemReader,
  ): FluentLoader<TValue>;

  /**
   * Provide a `canLoadValue` implementation in addition to this loader's. The resulting loader will only load entries
   * if both its original `canLoadValue` method is true and this additional implementation is true.
   *
   * @param canLoadValue The predicate to apply as part of the `canLoadValue` method.
   * @returns A new loader with the modified `canLoadValue` behavior.
   */
  when(canLoadValue: CanLoadValueFunc): FluentLoader<TValue>;

  /**
   * Add extension matching to the loader: require this specific extension.
   *
   * **Note:** Like all the `when...` methods, this adds a condition to the `canLoadValue` implementation in the
   * new loader. So, if the original loader has an extension constraint in place, this will apply _in addition to_ not
   * in the place of the existing constraint. E.g.,
   *
   * ```typescript
   * // Works
   * const myLoader = Loaders.textFile().whenExtensionIs(".foo");
   * ```
   *
   * The way to load _multiple_ extensions with the same loader is to use the {@linkcode whenExtensionIsOneOf} method.
   * Do not apply `whenExtensionIs` multiple times: unless they are identical, this will result in a loader that
   * matches nothing. E.g.,
   *
   * ```typescript
   * // DO NOT DO THIS!
   * const badLoader1 = Loaders.textFile().whenExtensionIs(".foo").whenExtensionIs(".bar");
   * const badLoader2 = Loaders.textFile({ extension: ".foo" }).whenExtensionIs(".bar");
   * ```
   *
   * @param extension The name extension to match.
   * @returns A new loader with the modified `canLoadValue` behavior.
   */
  whenExtensionIs(extension: string): FluentLoader<TValue>;

  /**
   * Add extension matching to the loader: require one of the supplied extensions.
   *
   * **Note:** Like all the `when...` methods, this adds a condition to the `canLoadValue` implementation in the
   * new loader. So, if the original loader has an extension constraint in place, this will apply _in addition to_ not
   * in the place of the existing constraint. So, generally, this means that you should create the loader with no
   * extension constraint, then add it via this method. E.g.,
   *
   * ```typescript
   * // Works
   * const myLoader = Loaders.textFile().whenExtensionIsOneOf([".foo", ".bar"]);
   * ```
   *
   * vs.
   *
   * ```typescript
   * // DO NOT DO THIS!
   * const myLoader = Loaders.textFile({ extension: ".txt" }).whenExtensionIsOneOf([".foo", ".bar"]);
   * ```
   *
   * @param extensions All the name extension that can match.
   * @returns A new loader with the modified `canLoadValue` behavior.
   */
  whenExtensionIsOneOf(extensions: string[]): FluentLoader<TValue>;

  /**
   * Apply a glob pattern-based matcher to the path in the input directory structure, so that only
   * files/directories whose relative path matches the pattern can be loaded by this loader.
   * Glob pattern matching is implemented using [picomatch](https://github.com/micromatch/picomatch).
   *
   * The relative path of the root directory being loaded is the empty string (""). Each file/directory
   * below the root is appended with a forward slash ("/") path separator. So, for example, a directory
   * structure with the corresponding relative paths:
   *
   * ```
   * .                         ""
   * ├── binary.bin            "/binary.bin"
   * ├── subdirectory          "/subdirectory"
   * │   └── nested.json       "/subdirectory/nested.json"
   * ├── subdirectory.json     "/subdirectory.json"
   * └── test.txt              "/test.txt"
   * ```
   * @param pattern The glob pattern to match against using [picomatch](https://github.com/micromatch/picomatch).
   * @returns A {@linkcode FluentLoader} instance to allow method chaining for further operations.
   */
  whenPathMatches(pattern: string): FluentLoader<TValue>;

  /**
   * Similar to {@linkcode whenPathMatches}: evaluates whether the current path matches **all** the specified patterns.
   * Glob pattern matching is implemented using [picomatch](https://github.com/micromatch/picomatch).
   *
   * @param patterns An array of string patterns to be matched against the path. All patterns must be satisfied. If this array is empty, all paths will match (following the semantics of ['Array.every'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every))
   * @returns A {@linkcode FluentLoader} instance to allow method chaining for further operations.
   */
  whenPathMatchesEvery(patterns: string[]): FluentLoader<TValue>;

  /**
   * Similar to {@linkcode whenPathMatches}: evaluates whether the current path matches **one or more** the specified
   * patterns.
   * Glob pattern matching is implemented using [picomatch](https://github.com/micromatch/picomatch).
   *
   * @param patterns An array of string patterns to be matched against the path. One or more patterns must be satisfied. If this array is empty, no path will ever match. (following the semantics of ['Array.some'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some))
   * @returns A {@linkcode FluentLoader} instance to allow method chaining for further operations.
   */
  whenPathMatchesSome(patterns: string[]): FluentLoader<TValue>;

  /**
   * Modifies the key computation by applying an additional transformation in addition to the existing key computation.
   * For example, to load text files with the ".txt" extension and store them as properties with an uppercased base name:
   *
   * ```typescript
   * const myLoader = Loaders.textFile({ extension: ".txt" }).computation((n) => n.toUpperCase());
   * ```
   *
   * @param computation
   */
  withKeyComputation(
    computation: (name: string) => string,
  ): FluentLoader<TValue>;

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

/**
 * The signature of the `canLoadValue` value loader method.
 */
export type CanLoadValueFunc = (
  entry: DirectoryEntryInContext,
) => boolean | Promise<boolean>;

/**
 * The signature of the `loadValue` value loader method.
 */
export type LoadValueFunc<TValue> = (
  entry: DirectoryEntryInContext,
  options?: Readonly<ValueLoaderOptions>,
) => Promise<TValue>;

export interface CustomFileLoaderBuildOptions extends FileLoaderBuildOptions {
  parser: StringParserFunc;
  canLoadValue?: CanLoadValueFunc;
}

export interface DirectoryLoaderBuildOptions {
  name?: string;
  loaders: Iterable<ValueLoader<unknown>>;
  defaultOptions?: Readonly<ValueLoaderOptions>;
}

/**
 * A fluent builder interface for creating value loaders.
 */
export interface LoaderBuilder {
  /**
   * Create a new text file loader. Returns the contents as a string.
   * Defaults to matching any file, regardless of extension. Use {@linkcode FluentLoader.whenExtensionIs} or
   * {@linkcode FluentLoader.whenExtensionIsOneOf} to match specific extensions.
   *
   * @param options The options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads text files.
   */
  textFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<string>;

  /**
   * Create a new binary file loader. Returns the contents as a `Uint8Array`.
   * Defaults to matching any file, regardless of extension. Use {@linkcode FluentLoader.whenExtensionIs} or
   * {@linkcode FluentLoader.whenExtensionIsOneOf} to match specific extensions.
   *
   * @param options The options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads binary files.
   */
  binaryFile(
    options?: Readonly<FileLoaderBuildOptions>,
  ): FluentLoader<Uint8Array>;

  /**
   * Create a new JSON file loader. Returns the contents as a value of unknown type.
   * Defaults to matching any file, regardless of extension. Use {@linkcode FluentLoader.whenExtensionIs} or
   * {@linkcode FluentLoader.whenExtensionIsOneOf} to match specific extensions.
   *
   * @param options The options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads JSON files.
   */
  jsonFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<unknown>;

  /**
   * Create a new custom file loader. Returns the contents as a value of unknown type.
   * Defaults to matching any file, regardless of extension. Use {@linkcode FluentLoader.whenExtensionIs} or
   * {@linkcode FluentLoader.whenExtensionIsOneOf} to match specific extensions.
   *
   * @param options The options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads the custom file format.
   */
  customFile(
    options?: Readonly<CustomFileLoaderBuildOptions>,
  ): FluentLoader<unknown>;

  /**
   * Create a new directory loader. Returns the contents as an **object**.
   * Uses the loaders in the `options` to load the individual directory contents.
   *
   * **Note:** To be consistent, regardless of the order directory entries were enumerated in, the directory listing
   * is sorted by name (in the constant locale) with the special provision that completely numeric file names are
   * sorted numerically and always sort before non-numeric file names.
   *
   * @param options The parameters and options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads objects from directories.
   */
  directoryAsObject(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<Record<string, unknown>>;

  /**
   * Create a new directory loader. Returns the contents as an **array**.
   * Uses the loaders in the `options` to load the individual directory contents.
   *
   * **Note:** To be consistent, regardless of the order directory entries were enumerated in, the directory listing
   * is sorted by name (in the constant locale) with the special provision that completely numeric file names are
   * sorted numerically and always sort before non-numeric file names.
   *
   * When the key of a directory entry returned by the matching loader is an integer, it is considered to be an index
   * in the array. This allows sparse arrays to be loaded: name the directory contents by their index and the array
   * will be created with just those items. If there are non-numeric directory contents, they will be appended to the
   * array after the last numerically-indexed item in lexicographic order.
   *
   * @param options The parameters and options to control the specifics of the loader.
   * @returns A {@linkcode FluentLoader} implementation that loads arrays from directories.
   */ directoryAsArray(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<unknown[]>;

  /**
   * Get a default set of loaders. A new instance is created with each call, so mutations are private to the returned
   * array. The defaults include a text loader for the ".txt" extension and a JSON loader for the ".json" extension.
   *
   * @returns An array of {@linkcode FluentLoader} implementations.
   */
  defaults(): FluentLoader<unknown>[];
}
