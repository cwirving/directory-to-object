import type {
  DirectoryContentsReader,
  DirectoryEntryInContext,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { mergeOptions, setOrMergeValue } from "./merge_utilities.ts";
import { isRecord } from "./is_record.ts";

/**
 * DirectoryValueLoader is responsible for loading the values from directory entries.
 *
 * It implements the ValueLoader interface and can load directory entries of type "directory".
 */
export class DirectoryValueLoader
  implements ValueLoader<Record<string, unknown>> {
  readonly name: string;
  readonly #loaders: ValueLoader<unknown>[];
  readonly #directoryReader: DirectoryContentsReader;
  readonly #defaultOptions: Readonly<ValueLoaderOptions> | undefined;

  constructor(
    name: string,
    loaders: Iterable<ValueLoader<unknown>>,
    directoryReader: DirectoryContentsReader,
    defaultOptions?: Readonly<ValueLoaderOptions>,
  ) {
    this.name = name;
    const clonedLoaders = Array.from(loaders);
    clonedLoaders.push(this);
    this.#loaders = clonedLoaders;
    this.#directoryReader = directoryReader;
    this.#defaultOptions = defaultOptions;
  }

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
  ): Promise<Record<string, unknown>> {
    if (entry.type !== "directory") {
      throw new TypeError(
        `Directory value loader attempting to load a non-directory from "${entry.url.href}"`,
      );
    }

    const mergedOptions = mergeOptions(this.#defaultOptions, options);
    mergedOptions?.signal?.throwIfAborted();

    const result: Record<string, unknown> = {};
    const contents = await this.#directoryReader.loadDirectoryContents(
      entry.url,
      options,
    );
    const propertyNameDecoder = mergedOptions?.propertyNameDecoder ??
      ((name) => name);

    for (const directoryEntry of contents as DirectoryEntryInContext[]) {
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
          const key = loader.computeKey(directoryEntry);
          if (key !== undefined) {
            const value = await loader.loadValue(directoryEntry, mergedOptions);

            // If the caller has requested that we embed file URLs, do it:
            if (
              directoryEntry.type === "file" && isRecord(value) &&
              typeof mergedOptions?.embedFileUrlAs === "string"
            ) {
              value[mergedOptions.embedFileUrlAs] = directoryEntry.url;
            }

            setOrMergeValue(
              result,
              propertyNameDecoder(key),
              value,
              mergedOptions,
            );
          }
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

    // If the caller has requested that we embed directory URLs, do it:
    if (typeof options?.embedDirectoryUrlAs === "string") {
      result[options.embedDirectoryUrlAs] = entry.url;
    }

    return result;
  }
}
