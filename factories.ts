import { CurrentRuntime, Runtime } from "@cross/runtime";
import type {
  DirectoryContentsReader,
  FileTextLoader,
  FileValueLoader,
  FileValueLoaderOptions,
  Platform,
} from "./interfaces.ts";
import * as JSONC from "@std/jsonc";
import * as YAML from "@std/yaml";

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
