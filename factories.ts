import { CurrentRuntime, Runtime } from "@cross/runtime";
import type {
  DirectoryContentsReader,
  DirectoryObjectLoader,
  DirectoryObjectLoaderOptions,
  FileBinaryLoader,
  FileTextLoader,
  FileValueLoader,
  FileValueLoaderOptions,
  Platform,
} from "./interfaces.ts";
import {
  genericLoadObjectFromDirectory,
  validateLoaders,
} from "./directory_loader.ts";

const nodeLikeRuntimes = [Runtime.Bun, Runtime.Node];

async function getCurrentPlatform(): Promise<Platform> {
  if (CurrentRuntime === Runtime.Deno) {
    const platformModule = await import("./platform_deno.ts");
    return platformModule.platform;
  } else if (nodeLikeRuntimes.includes(CurrentRuntime)) {
    const platformModule = await import("./platform_node.ts");
    return platformModule.platform;
  } else {
    throw new Error("Unsupported platform/runtime");
  }
}

export async function newFileTextLoader(): Promise<FileTextLoader> {
  return (await getCurrentPlatform()).fileTextLoader;
}

export async function newFileBinaryLoader(): Promise<FileBinaryLoader> {
  return (await getCurrentPlatform()).fileBinaryLoader;
}

export async function newDirectoryContentsReader(): Promise<
  DirectoryContentsReader
> {
  return (await getCurrentPlatform()).directoryContentsReader;
}

export function newTextFileValueLoader(
  textLoader: FileTextLoader,
): Promise<FileValueLoader> {
  return Promise.resolve<FileValueLoader>(Object.freeze({
    name: "Text file value loader",
    loadValueFromFile: (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      return textLoader.loadTextFromFile(path, options);
    },
  }));
}

export type StringParserFunc = (input: string) => unknown;

export function newStringParserFileValueLoader(
  textLoader: FileTextLoader,
  parser: StringParserFunc,
  name: string,
): Promise<FileValueLoader> {
  return Promise.resolve<FileValueLoader>(Object.freeze({
    name: name,
    loadValueFromFile: async (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      const text = await textLoader.loadTextFromFile(path, options);
      return parser(text);
    },
  }));
}

export function newJsonFileValueLoader(
  textLoader: FileTextLoader,
): Promise<FileValueLoader> {
  return newStringParserFileValueLoader(
    textLoader,
    JSON.parse,
    "JSON file value loader",
  );
}

export async function newDefaultFileValueLoaders(): Promise<
  Map<string, FileValueLoader>
> {
  const textLoader = await newFileTextLoader();
  return new Map<string, FileValueLoader>([
    [".json", await newJsonFileValueLoader(textLoader)],
    [".txt", await newTextFileValueLoader(textLoader)],
  ]);
}

export function newDirectoryObjectLoader(
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
  directoryReader: DirectoryContentsReader,
): Promise<DirectoryObjectLoader> {
  return Promise.resolve<DirectoryObjectLoader>(Object.freeze({
    name: "Generic directory object loader",
    _loaders: loaders, // Not used. Just present to make code easier to debug.
    loadObjectFromDirectory: (
      path: URL,
      options?: DirectoryObjectLoaderOptions,
    ) => {
      options?.signal?.throwIfAborted();
      const clonedLoaders = Array.from(loaders);
      validateLoaders(clonedLoaders);
      return genericLoadObjectFromDirectory(
        path,
        clonedLoaders,
        directoryReader,
        options,
      );
    },
  }));
}
