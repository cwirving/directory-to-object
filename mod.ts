import type {
  FluentLoader,
  LoaderBuilder,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { newFileSystemReader } from "./factories.ts";
import { DefaultLoaderBuilder } from "./loader_builder.ts";

/**
 * The loader builder to create any of the built-in loaders and customize them to your needs. See the
 * {@linkcode LoaderBuilder} interface for more details.
 */
export const Loaders: LoaderBuilder = new DefaultLoaderBuilder(
  newFileSystemReader(),
);

/**
 * The loaders that the {@linkcode loadObjectFromDirectory} function will use to initialize its loader.
 * This array is mutable for customization.
 *
 * For example, to add a YAML parser to the default loaders:
 *
 * ```typescript
 * import * as YAML from "@std/yaml";
 *
 * // Create a YAML file loader
 * const yamlLoader = Loaders.customFile({
 *   extension: ".yaml",
 *   name: "YAML file value loader",
 *   parser: YAML.parse,
 * });
 *
 * // Add it to the default loaders
 * defaultLoaders.push(yamlLoader);
 *
 * // From now on, calls to loadObjectFromDirectory() will know to parse
 * // files with a ".yaml" extension as YAML...
 * ```
 */
export const defaultLoaders: FluentLoader<unknown>[] = Loaders.defaults();

/**
 * Asynchronously load the contents of a directory into a new plain JavaScript object.
 * This will retrieve a listing of the directory, iterate over each file/directory listed
 * and load those that have file value loaders registered.
 *
 * **Note:** The file value loaders defined in the `defaultLoaders` variable are queried in array order,
 * so consumers that care about loader precedence should make sure to sort the array appropriately.
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
