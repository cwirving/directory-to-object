import type {
  DirectoryEntryInContext,
  FileSystemReader,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { mergeOptions, setOrMergeValue } from "./merge_utilities.ts";
import { isRecord } from "./is_record.ts";
import { numberAwareComparison, parseInt } from "./number_aware_comparison.ts";
import { ensureIsDefined } from "./ensure_is_defined.ts";

/**
 * This is the shape of the data we'll combine with the directory entries we get from the directory reader in order
 * to call the loaders in context and do the bookkeeping needed to sort entries before loading.
 */
interface DirectoryEntryWithLoadingDecision extends DirectoryEntryInContext {
  /**
   * The loader that will be used for this entry.
   */
  loader: ValueLoader<unknown>;

  /**
   * The key that the loader computed for this entry.
   */
  key: string | undefined;

  /**
   * The key, after decoding. This is what we'll sort entries by and use as the key for storing the loaded value
   * in the resulting object/array.
   */
  decodedKey: string | undefined;
}

/**
 * DirectoryValueLoader is the abstract class responsible for loading the values from directory entries into objects
 * or arrays. The {@linkcode DirectoryObjectValueLoader} and {@linkcode DirectoryArrayValueLoader} specializations
 * control whether the value type is an object or array.
 *
 * It implements the ValueLoader interface and can load directory entries of type "directory".
 */
abstract class DirectoryValueLoader
  implements ValueLoader<Record<string, unknown> | unknown[]> {
  readonly name: string;
  readonly #loaders: ValueLoader<unknown>[];
  readonly #fileSystemReader: FileSystemReader;
  readonly #defaultOptions: Readonly<ValueLoaderOptions> | undefined;

  protected constructor(
    name: string,
    loaders: Iterable<ValueLoader<unknown>>,
    fileSystemReader: FileSystemReader,
    defaultOptions?: Readonly<ValueLoaderOptions>,
  ) {
    this.name = name;
    const clonedLoaders = Array.from(loaders);
    clonedLoaders.push(this);
    this.#loaders = clonedLoaders;
    this.#fileSystemReader = fileSystemReader;
    this.#defaultOptions = defaultOptions;
  }

  /**
   * Abstract method to generate a new empty result, which can either be a record with string keys and unknown values or
   * an array of unknown elements, depending on the subclass.
   *
   * @return Returns a newly created empty result, represented as either a record object or an array.
   */
  abstract newEmptyResult(): Record<string, unknown> | unknown[];

  /**
   * We only can load directories.
   *
   * @param entry The directory entry to examine.
   * @returns `true` if the entry is of type "directory".
   */
  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean> {
    return entry.type === "directory";
  }

  /**
   * Determines the key for the provided directory entry -- since we only handle directories, it is the directory name.
   *
   * @param entry - The directory entry from which the key will be computed.
   * @returns The name of the directory.
   */
  computeKey(entry: DirectoryEntryInContext): string | undefined {
    return entry.name;
  }

  /**
   * Loads the value of a directory entry and returns it as a plain JavaScript object.
   *
   * @param entry The directory entry to load. Must be of type "directory".
   * @param options Optional configuration parameters for the value loader.
   * @returns A promise that resolves to a plain JavaScript object containing the loaded values.
   * @throws {TypeError} If the entry is not a directory.
   * @throws {Error} If in strict mode and an entry cannot be loaded.
   */
  async loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<Record<string, unknown> | unknown[]> {
    if (entry.type !== "directory") {
      throw new TypeError(
        `Directory value loader attempting to load a non-directory from "${entry.url.href}"`,
      );
    }

    const mergedOptions = mergeOptions(this.#defaultOptions, options);
    mergedOptions?.signal?.throwIfAborted();

    const result = this.newEmptyResult();
    const actualFileSystemReader = mergedOptions?.fileSystemReader ??
      this.#fileSystemReader;
    const contents = await actualFileSystemReader.readDirectoryContents(
      entry.url,
      options,
    );
    const entries = contents.entries as DirectoryEntryWithLoadingDecision[];

    const propertyNameDecoder = mergedOptions?.propertyNameDecoder ??
      ((name) => name);

    // Step 1: look at all the directory entries and decide which loader can handle them, what their resulting key
    // will be, etc. But DO NOT load them yet.
    for (const directoryEntry of entries) {
      directoryEntry.relativePath =
        `${entry.relativePath}/${directoryEntry.name}`;
      let loaded = false;

      for (const loader of this.#loaders) {
        const canLoadEntryMaybePromise = loader.canLoadValue(directoryEntry);
        if (
          (canLoadEntryMaybePromise instanceof Promise)
            ? await canLoadEntryMaybePromise
            : canLoadEntryMaybePromise
        ) {
          directoryEntry.loader = loader;
          const key = loader.computeKey(directoryEntry);
          directoryEntry.key = key;
          directoryEntry.decodedKey = (key !== undefined)
            ? propertyNameDecoder(key)
            : undefined;
          loaded = true;
          break;
        }
      }

      if (mergedOptions?.strict && !loaded) {
        throw new Error(
          `Directory entry at "${directoryEntry.url}" cannot be loaded`,
        );
      }
    }

    // Step 2: sort the directory entries by decoded key.
    entries.sort((a, b) => numberAwareComparison(a.decodedKey, b.decodedKey));

    // Step 3: Load the entries in order.
    let index = 0;
    for (const directoryEntry of entries) {
      if (directoryEntry.key !== undefined) {
        const value = await directoryEntry.loader.loadValue(
          directoryEntry,
          mergedOptions,
        );
        const decodedKey = ensureIsDefined(directoryEntry.decodedKey);

        // If the caller has requested that we embed file URLs, do it:
        if (
          directoryEntry.type === "file" && isRecord(value) &&
          typeof mergedOptions?.embedFileUrlAs === "string"
        ) {
          value[mergedOptions.embedFileUrlAs] = directoryEntry.url;
        }

        // Set the value, with variations depending on this being an array or object.
        index = this.setValue(result, decodedKey, index, value, mergedOptions);

        ++index;
      }
    }

    // If the caller has requested that we embed directory URLs, do it:
    this.embedDirectoryUrl(result, entry, options);

    contents.dispose?.();
    return result;
  }

  // Embed the directory URL in te result, if requested and it is contextually appropriate.
  protected abstract embedDirectoryUrl(
    result: Record<string, unknown> | unknown[],
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): void;

  // Set the current vale in the result object/array. The implementation depends on whether this is an object
  // or array loader.
  protected abstract setValue(
    result: Record<string, unknown> | unknown[],
    decodedKey: string,
    index: number,
    value: unknown,
    mergedOptions?: Readonly<ValueLoaderOptions>,
  ): number;
}

export class DirectoryObjectValueLoader extends DirectoryValueLoader
  implements ValueLoader<Record<string, unknown>> {
  /**
   * Constructs a `DirectoryObjectValueLoader` instance. This is the loader for directories as _objects_, built using the
   * general implementation in class {@linkcode DirectoryValueLoader}.
   *
   * @param name The name of the loader.
   * @param loaders An iterable collection of value loaders used to handle directory entries.
   * @param fileSystemReader The directory contents reader responsible for reading the directory contents.
   * @param defaultOptions Optional default options for the loader.
   */
  constructor(
    name: string,
    loaders: Iterable<ValueLoader<unknown>>,
    fileSystemReader: FileSystemReader,
    defaultOptions?: Readonly<ValueLoaderOptions>,
  ) {
    super(name, loaders, fileSystemReader, defaultOptions);
  }

  newEmptyResult(): Record<string, unknown> {
    return {};
  }

  override loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<Record<string, unknown>> {
    return super.loadValue(entry, options) as Promise<Record<string, unknown>>;
  }

  protected override embedDirectoryUrl(
    result: Record<string, unknown>,
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): void {
    if (typeof options?.embedDirectoryUrlAs === "string") {
      result[options.embedDirectoryUrlAs] = entry.url;
    }
  }

  protected override setValue(
    result: Record<string, unknown>,
    decodedKey: string,
    index: number,
    value: unknown,
    mergedOptions?: Readonly<ValueLoaderOptions>,
  ): number {
    setOrMergeValue(
      result,
      decodedKey,
      value,
      mergedOptions,
    );
    return index;
  }
}

export class DirectoryArrayValueLoader extends DirectoryValueLoader
  implements ValueLoader<unknown[]> {
  /**
   * Constructs a `DirectoryArrayValueLoader` instance. This is the loader for directories as _arrays_, built using the
   * general implementation in class {@linkcode DirectoryValueLoader}.
   *
   * @param name The name of the loader.
   * @param loaders An iterable collection of value loaders used to handle directory entries.
   * @param fileSystemReader The directory contents reader responsible for reading the directory contents.
   * @param defaultOptions Optional default options for the loader.
   */
  constructor(
    name: string,
    loaders: Iterable<ValueLoader<unknown>>,
    fileSystemReader: FileSystemReader,
    defaultOptions?: Readonly<ValueLoaderOptions>,
  ) {
    super(name, loaders, fileSystemReader, defaultOptions);
  }

  newEmptyResult(): unknown[] {
    return [];
  }

  override loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<unknown[]> {
    return super.loadValue(entry, options) as Promise<unknown[]>;
  }

  protected override embedDirectoryUrl(
    _result: unknown[],
    _entry: DirectoryEntryInContext,
    _options?: Readonly<ValueLoaderOptions>,
  ): void {}

  protected override setValue(
    result: unknown[],
    decodedKey: string,
    index: number,
    value: unknown,
    _mergedOptions?: Readonly<ValueLoaderOptions>,
  ): number {
    const maybeNameAsIndex = parseInt(decodedKey);
    if (maybeNameAsIndex == maybeNameAsIndex) {
      index = maybeNameAsIndex;
    }
    result[index] = value;

    return index;
  }
}
