import { CurrentRuntime, Runtime } from "@cross/runtime";
import type {
  DirectoryContentsReader,
  DirectoryObjectLoader,
  DirectoryObjectLoaderOptions,
  FileTextLoader,
  FileValueLoader,
  FileValueLoaderOptions,
  Platform,
} from "./interfaces.ts";
import * as JSONC from "@std/jsonc";
import * as YAML from "@std/yaml";
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
      return textLoader.loadTextFromFile(path, options);
    },
  }));
}

export function newJsonFileValueLoader(
  textLoader: FileTextLoader,
): Promise<FileValueLoader> {
  return Promise.resolve<FileValueLoader>(Object.freeze({
    name: "JSON file value loader",
    loadValueFromFile: async (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      const text = await textLoader.loadTextFromFile(path, options);
      return JSON.parse(text);
    },
  }));
}

export function newJsonWithCommentsFileValueLoader(
  textLoader: FileTextLoader,
): Promise<FileValueLoader> {
  return Promise.resolve<FileValueLoader>(Object.freeze({
    name: "JSONC file value loader",
    loadValueFromFile: async (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      const text = await textLoader.loadTextFromFile(path, options);
      return JSONC.parse(text);
    },
  }));
}

export function newYamlFileValueLoader(
  textLoader: FileTextLoader,
): Promise<FileValueLoader> {
  return Promise.resolve<FileValueLoader>(Object.freeze({
    name: "YAML file value loader",
    loadValueFromFile: async (
      path: URL,
      options?: FileValueLoaderOptions,
    ) => {
      const text = await textLoader.loadTextFromFile(path, options);
      return YAML.parse(text);
    },
  }));
}

export async function newDefaultFileValueLoaders(): Promise<
  Map<string, FileValueLoader>
> {
  const textLoader = await newFileTextLoader();
  return new Map<string, FileValueLoader>([
    [".json", await newJsonFileValueLoader(textLoader)],
    [".jsonc", await newJsonWithCommentsFileValueLoader(textLoader)],
    [".yaml", await newYamlFileValueLoader(textLoader)],
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
