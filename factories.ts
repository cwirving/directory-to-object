import type {
  DirectoryContentsReader,
  DirectoryObjectLoader,
  DirectoryObjectLoaderOptions,
  FileBinaryReader,
  FileTextReader,
  FileValueLoader,
  FileValueLoaderOptions,
} from "./interfaces.ts";
import {
  loadObjectFromDirectoryEx,
  validateLoaders,
} from "./directory_loader.ts";
import { platform } from "./platform.ts";
import { mergeOptions } from "./merge_utilities.ts";

/**
 * Create a new text file text reader appropriate for reading local files on the current platform.
 *
 * Text file loaders don't interpret the contents of the file, they just return them as-is (as a string).
 *
 * @returns An object implementing the {@link FileTextReader} interface.
 */
export function newFileTextReader(): FileTextReader {
  return platform.fileTextReader;
}

/**
 * Create a new binary file text reader appropriate for reading local files on the current platform.
 *
 * Binary file loaders don't interpret the contents of the file, they just return them as-is (as a `Uint8Array`).
 *
 * @returns An object implementing the {@link FileBinaryReader} interface.
 */
export function newFileBinaryReader(): FileBinaryReader {
  return platform.fileBinaryReader;
}

/**
 * Create a new directory contents reader appropriate for reading directory contents on the current platform.
 *
 * @returns An object implementing the {@link DirectoryContentsReader} interface.
 */
export function newDirectoryContentsReader(): DirectoryContentsReader {
  return platform.directoryContentsReader;
}

/**
 * Create a new loader for plain text files, using the provided file text reader.
 *
 * @param textReader The file text reader to perform the physical file reading.
 * @returns An object implementing the {@link FileValueLoader} interface that performs plain text file loading into string values.
 */
export function newTextFileValueLoader(
  textReader: FileTextReader,
): FileValueLoader {
  return Object.freeze({
    name: "Text file value loader",
    loadValueFromFile: (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      return textReader.readTextFromFile(path, options);
    },
  });
}

/**
 * Create a new loader for (opaque) binary files, using the provided binary file loader.
 *
 * @param binaryReader The binary file reader used to perform the physical file reading.
 * @returns An object implementing the {@link FileValueLoader} interface.
 */
export function newBinaryFileValueLoader(
  binaryReader: FileBinaryReader,
): FileValueLoader {
  return Object.freeze({
    name: "Binary file value loader",
    loadValueFromFile: (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      return binaryReader.readBinaryFromFile(path, options);
    },
  });
}

/**
 * The signature expected of string parser functions passed to {@linkcode newStringParserFileValueLoader} function.
 */
export type StringParserFunc = (input: string) => unknown;

/**
 * Create a new text file loader using an externally-provided parser function.
 *
 * @param textReader The underlying text file reader used to perform the physical file reading.
 * @param parser The string parser function applied to the string loaded by the text file reader.
 * @param name The name to give the resulting file value loader.
 * @returns An object implementing the {@link FileValueLoader} interface.
 */
export function newStringParserFileValueLoader(
  textReader: FileTextReader,
  parser: StringParserFunc,
  name: string,
): FileValueLoader {
  return Object.freeze({
    name: name,
    loadValueFromFile: async (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      const text = await textReader.readTextFromFile(path, options);
      return parser(text);
    },
  });
}

/**
 * Create a new JSON file value loader with the provided text file reader.
 *
 * @param textReader The underlying text file reader used to perform physical file reading.
 * @returns An object implementing the {@link FileValueLoader} interface which reads and parses JSON files.
 */
export function newJsonFileValueLoader(
  textReader: FileTextReader,
): FileValueLoader {
  return newStringParserFileValueLoader(
    textReader,
    JSON.parse,
    "JSON file value loader",
  );
}

/**
 * Create the default file value loaders using built-in types:
 * - A text file value loader for the ".txt" file extension.
 * - A JSON file value loader for the ".json" file extension.
 *
 * This map can be passed to the {@link newDirectoryObjectLoader} function to specify which
 * file extensions will be processed and the corresponding file loader.
 *
 * The function returns a new map each time it is called, so the caller can
 * add additional entries without interfering with other loader maps.
 *
 * @returns A map of file extensions (as strings, including the dot -- e.g., ".txt") to the corresponding {@link FileValueLoader} to use for that extension.
 */
export function newDefaultFileValueLoaders(): Map<string, FileValueLoader> {
  const textReader = newFileTextReader();
  return new Map<string, FileValueLoader>([
    [".json", newJsonFileValueLoader(textReader)],
    [".txt", newTextFileValueLoader(textReader)],
  ]);
}

/**
 * Create a new directory object loader, given loader mappings and a directory reader.
 *
 * @param loaders The mappings from file extension to file loader. Note that this can be an ordered array of tuples -- they are checked in order.
 * @param directoryReader The optional directory reader used to determine directory contents. Defaults to a local directory reader.
 * @param name The optional name of the loader.
 * @param defaultOptions Default options that will be used by the directory object loader. Options provided in calls to `loadObjectFromDirectory` will override these defaults. If both defaults and call options are provided, they are merged.
 * @returns An object implementing interface {@link DirectoryContentsReader}.
 */
export function newDirectoryObjectLoader(
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
  directoryReader?: DirectoryContentsReader,
  name?: string,
  defaultOptions?: Readonly<DirectoryObjectLoaderOptions>,
): DirectoryObjectLoader {
  if (directoryReader === undefined) {
    directoryReader = newDirectoryContentsReader();
  }

  // We clone the loader iterable to an array to maintain their order.
  const clonedLoaders = Array.from(loaders);
  validateLoaders(clonedLoaders);

  return Object.freeze({
    name: name ?? "Generic directory object loader",
    _defaultOptions: defaultOptions, // Not used. Just present to make code easier to debug.
    _loaders: loaders, // Not used. Just present to make code easier to debug.
    loadObjectFromDirectory: async (
      path: URL,
      options?: Readonly<DirectoryObjectLoaderOptions>,
    ) => {
      const mergedOptions = mergeOptions(defaultOptions, options);
      mergedOptions?.signal?.throwIfAborted();

      return await loadObjectFromDirectoryEx(
        path,
        clonedLoaders,
        directoryReader,
        mergedOptions,
      );
    },
  });
}
