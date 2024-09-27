import type { DirectoryObjectLoaderOptions, FileValueLoader } from './interfaces.ts';
import {
  newDefaultFileValueLoaders,
  newDirectoryObjectLoader,
} from "./factories.ts";

export type * from "./interfaces.ts";
export * from "./factories.ts";

/**
 * The file value loaders that will be used by the top-level `loadObjectFromDirectory`
 * function. These default to a set containing just ".json" and ".txt" _local_ file loaders,
 *  but the set can be modified at runtime and changes will apply the next time
 * `loadObjectFromDirectory` is called.
 */
export const fileValueLoaders: Map<string, FileValueLoader> = newDefaultFileValueLoaders();

/**
 * Asynchronously load the contents of a directory into a new plain JavaScript object.
 * This will retrieve a listing of the directory, iterate over each file/directory listed
 * and load those that have file value loaders registered.
 *
 * **Note:** The file value loaders defined in the `fileValueLoaders` variable are applied in an
 * unspecified order, so this convenience function should only be used in the (most common) case
 * where there are no conflicting loaders. If you need to control the loader priority
 * order, construct your own file value loaders in an array of tuples and construct a directory
 * object loader directly using the `newDirectoryObjectLoader` factory function/
 *
 * @param path The URL of the directory to load. For local directories, this should be a `file:` URL.
 * @param options Options governing the loading of directory and file data, including an optional `AbortSignal`.
 */
export function loadObjectFromDirectory(
  path: URL,
  options?: DirectoryObjectLoaderOptions,
): Promise<Record<string, unknown>> {
  const directoryObjectLoader = newDirectoryObjectLoader(fileValueLoaders);

  return directoryObjectLoader.loadObjectFromDirectory(path, options);
}
