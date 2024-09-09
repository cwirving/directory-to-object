import type {
  DirectoryContentsReader,
  DirectoryObjectLoaderOptions,
  FileValueLoader,
  FileValueLoaderOptions,
} from "./interfaces.ts";
import { merge } from "jsr:@es-toolkit/es-toolkit";

const validExtensionRegex = /^(\.\w+)+$/;

export function validateLoaders(
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
): void {
  for (const [key, _value] of loaders) {
    if (validExtensionRegex.exec(key) === null) {
      throw new Error(`"${key}" is not a valid file extension`);
    }
  }
}

export function isRecord(
  candidate: unknown,
): candidate is Record<string, unknown> {
  if (
    typeof candidate === "object" && candidate !== null &&
    !Array.isArray(candidate)
  ) {
    const proto = Object.getPrototypeOf(candidate);
    return proto === null || proto === Object.prototype;
  }

  return false;
}

export function setOrMergeValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (isRecord(value)) {
    const targetValue = target[key];

    if (isRecord(targetValue)) {
      merge(targetValue, value);
      return;
    }
  }

  target[key] = value;
}

export async function loadValueFromFile(
  name: string,
  path: URL,
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
  options?: FileValueLoaderOptions,
): Promise<[string, unknown] | undefined> {
  for (const [extension, fileLoader] of loaders) {
    if (name.endsWith(extension)) {
      const key = name.substring(0, name.length - extension.length);
      const value = await fileLoader.loadValueFromFile(path, options);
      return [key, value];
    }
  }
  return undefined;
}

export async function genericLoadObjectFromDirectory(
  path: URL,
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
  directoryReader: DirectoryContentsReader,
  options?: DirectoryObjectLoaderOptions,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  const contents = await directoryReader.loadDirectoryContents(path, options);

  for (const entry of contents) {
    switch (entry.type) {
      case "file": {
        const loaded = await loadValueFromFile(
          entry.name,
          entry.url,
          loaders,
          options,
        );
        if (loaded !== undefined) {
          const [key, value] = loaded;
          setOrMergeValue(result, key, value);
        }
        break;
      }
      case "directory":
        setOrMergeValue(
          result,
          entry.name,
          await genericLoadObjectFromDirectory(
            entry.url,
            loaders,
            directoryReader,
            options,
          ),
        );
        break;
      default:
        break;
    }
  }
  return {};
}
