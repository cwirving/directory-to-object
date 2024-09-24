import type {
  DirectoryContentsReader,
  DirectoryObjectLoaderOptions,
  FileValueLoader,
  FileValueLoaderOptions,
} from "./interfaces.ts";
import { merge } from "@es-toolkit/es-toolkit";

/**
 * This regular expression is what we consider to be a valid file extension.
 */
const _validExtensionRegex = /^(\.\w+)+$/;

/**
 * Make sure that the file value loaders are valid (have valid file name extensions).
 *
 * @param loaders
 */
export function validateLoaders(
  loaders: Iterable<Readonly<[string, FileValueLoader]>>,
): void {
  for (const [key, _value] of loaders) {
    if (_validExtensionRegex.exec(key) === null) {
      throw new Error(`"${key}" is not a valid file extension`);
    }
  }
}

/**
 * Check that a value is a plain JavaScript object (i.e., not a class instance).
 *
 * @param candidate The value to introspect.
 */
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

/**
 * Set a property value on the target object, unless:
 * - there is already a property on the target
 * - the value of the existing property is a plain JavaScript object
 * - the new value is also a plain JavaScript object
 *
 * ... in which case the existing property value and new value will be merged in place.
 *
 * Note: This is for internal use only. Not part of the public library API.
 *
 * @param target The target plain JavaScript object where the property will be set.
 * @param key The key of the property to set.
 * @param value The new value to set (or merge).
 */
export function _setOrMergeValue(
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

/**
 * Load the value of a file, using the file value loaders specified. The loaders are
 * examined in iteration order to determine which will be used: the first loader that
 * (case-sensitively) matches the file name extension will be used with no fallback.
 *
 * @param name The name of the file, including extension.
 * @param path The URL of the file. I.e., `file:` URL for local files.
 * @param loaders The file value loaders to consider for the file.
 * @param options Options to pass to the file value loader used.
 * @returns The value of the loaded file (could be any valid JavaScript data type) or `undefined` if there was no file value loader for the extension.
 */
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

  // We don't want to throw an exception here because this is not an error.
  // We'll be scanning directories will all sorts of other junk in them in addition
  // to the files intended to be loaded, so throwing here would just be painful.
  return undefined;
}

/**
 * Generic implementation of a directory to object loader. Loads the contents of a directory
 * as a plain JavaScript object, using the {@linkcode loadValueFromFile} function to load
 * the values of files in the directory into properties named like the extension-less file name.
 *
 * The difference between this and the module-level `loadObjectFromDirectory` function is
 * that is the inner, fully-parameterized, version of the function. The module-level function
 * is a convenience, this is the inner plumbing.
 *
 * The naming is a wink to the Microsoft convention of old where Windows APIs had basic versions
 * and "Ex" versions with more parameters.
 *
 * @param path The URL of the directory to load. I.e., `file:` URL for local directories.
 * @param loaders The file value loaders to consider when loading directory contents.
 * @param directoryReader The directory reader implementation to use to read the directory listing.
 * @param options Options to pass to the directory reader and file value loaders as they are called.
 */
export async function loadObjectFromDirectoryEx(
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
          _setOrMergeValue(result, key, value);
        }
        break;
      }
      case "directory":
        _setOrMergeValue(
          result,
          entry.name,
          await loadObjectFromDirectoryEx(
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
  return result;
}
