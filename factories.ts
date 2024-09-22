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
  genericLoadObjectFromDirectory,
  validateLoaders,
} from "./directory_loader.ts";
import { platform } from "./platform.ts";

export function newFileTextReader(): FileTextReader {
  return platform.fileTextReader;
}

export function newFileBinaryReader(): FileBinaryReader {
  return platform.fileBinaryReader;
}

export function newDirectoryContentsReader(): DirectoryContentsReader {
  return platform.directoryContentsReader;
}

export function newTextFileValueLoader(
  textLoader: FileTextReader,
): FileValueLoader {
  return Object.freeze({
    name: "Text file value loader",
    loadValueFromFile: (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      return textLoader.readTextFromFile(path, options);
    },
  });
}

export function newBinaryFileValueLoader(
  binaryLoader: FileBinaryReader,
): FileValueLoader {
  return Object.freeze({
    name: "Binary file value loader",
    loadValueFromFile: (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      return binaryLoader.readBinaryFromFile(path, options);
    },
  });
}

export type StringParserFunc = (input: string) => unknown;

export function newStringParserFileValueLoader(
  textLoader: FileTextReader,
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
      const text = await textLoader.readTextFromFile(path, options);
      return parser(text);
    },
  });
}

export function newJsonFileValueLoader(
  textLoader: FileTextReader,
): FileValueLoader {
  return newStringParserFileValueLoader(
    textLoader,
    JSON.parse,
    "JSON file value loader",
  );
}

export function newDefaultFileValueLoaders(): Map<string, FileValueLoader> {
  const textLoader = newFileTextReader();
  return new Map<string, FileValueLoader>([
    [".json", newJsonFileValueLoader(textLoader)],
    [".txt", newTextFileValueLoader(textLoader)],
  ]);
}

export function newDirectoryObjectLoader(
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
  directoryReader?: DirectoryContentsReader,
): DirectoryObjectLoader {
  if (directoryReader === undefined) {
    directoryReader = newDirectoryContentsReader();
  }

  return Object.freeze({
    name: "Generic directory object loader",
    _loaders: loaders, // Not used. Just present to make code easier to debug.
    loadObjectFromDirectory: async (
      path: URL,
      options?: DirectoryObjectLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      // We clone to an array to maintain the loader order.
      const clonedLoaders = Array.from(loaders);
      validateLoaders(clonedLoaders);
      return await genericLoadObjectFromDirectory(
        path,
        clonedLoaders,
        directoryReader,
        options,
      );
    },
  });
}
