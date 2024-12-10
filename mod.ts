import type { LoaderBuilder, ValueLoaderOptions } from "./interfaces.ts";
import {
  DefaultLoaderBuilder,
  newDirectoryContentsReader,
  newFileReader,
} from "./factories.ts";

export type * from "./interfaces.ts";
export * from "./factories.ts";

/**
 * !!!
 */
export const Loaders: LoaderBuilder = new DefaultLoaderBuilder(
  newFileReader(),
  newDirectoryContentsReader(),
);

/**
 * !!!
 */
export const defaultLoaders = Loaders.defaults();

/**
 * Asynchronously load the contents of a directory into a new plain JavaScript object.
 * This will retrieve a listing of the directory, iterate over each file/directory listed
 * and load those that have file value loaders registered.
 *
 * **Note:** The file value loaders defined in the `defaultLoaders` variable are queried in array order,
 * so consumers that care about loader precedence should make sure to sort the array appropriately. Typically,
 * this is unnecessary, though.
 *
 * @param directoryUrl The URL of the directory to load. For local directories, this should be a `file:` URL.
 * @param options Options governing the loading of directory and file data, including an optional `AbortSignal`.
 */
export function loadObjectFromDirectory(
  directoryUrl: URL,
  options?: ValueLoaderOptions,
): Promise<Record<string, unknown>> {
  const directoryObjectLoader = Loaders.directoryAsObject({
    loaders: defaultLoaders,
  });

  return directoryObjectLoader.loadDirectory(directoryUrl, options);
}
