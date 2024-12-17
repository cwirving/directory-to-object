/**
 * The functions in this module are the lower-level implementation details of the public API. They allow advanced
 * consumers to control precisely how the library interacts with the file system or provide their own file system-like
 * implementations.
 *
 * The {@linkcode newFileReader} function is a platform-neutral way of creating the file reading abstraction used
 * throughout this library.
 *
 * The {@linkcode newDirectoryContentsReader} function is a platform-neutral way of creating the directory contents
 * reader abstraction used throughout this library.
 *
 * The {@linkcode DefaultLoaderBuilder} is the default implementation of the {@linkcode LoaderBuilder} interface.
 * It is initialized with {@linkcode FileReader} and {@linkcode DirectoryContentsReader}
 * implementations. It is used to build all the loaders known to the library in a fluent way.
 *
 * @module
 */
import type {
  CustomFileLoaderBuildOptions,
  DirectoryContentsReader,
  DirectoryEntryInContext,
  DirectoryLoaderBuildOptions,
  FileLoaderBuildOptions,
  FileReader,
  FluentLoader,
  LoaderBuilder,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { platform } from "./platform.ts";
import { makeFluent } from "./fluent_loader.ts";
import {
  DirectoryArrayValueLoader,
  DirectoryObjectValueLoader,
} from "./directory_loader.ts";

/**
 * Create a new file reader appropriate for reading local files on the current platform.
 *
 * File readers don't interpret the contents of the file they read, they just return them as-is.
 *
 * @returns An object implementing the {@link FileReader} interface.
 */
export function newFileReader(): FileReader {
  return platform.fileReader;
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
 * The concrete implementation of the {@linkcode LoaderBuilder} interface exposed by this library.
 * It creates the file and directory loaders known to the library.
 */
export class DefaultLoaderBuilder implements LoaderBuilder {
  readonly #fileReader: FileReader;
  readonly #directoryContentsReader: DirectoryContentsReader;

  /**
   * Constructs an instance of the class with its required readers.
   *
   * @param fileReader - The object responsible for reading files.
   * @param directoryContentsReader - the object responsible for reading directory contents.
   */
  constructor(
    fileReader: FileReader,
    directoryContentsReader: DirectoryContentsReader,
  ) {
    this.#fileReader = fileReader;
    this.#directoryContentsReader = directoryContentsReader;
  }

  textFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<string> {
    const name = options?.name ?? "Text file value loader";
    const extension = options?.extension ?? "";
    const fileReader = this.#fileReader;

    return makeFluent<string>({
      name: name,
      canLoadValue: function (
        entry: DirectoryEntryInContext,
      ): boolean | Promise<boolean> {
        return entry.name.endsWith(extension);
      },
      computeKey: function (
        entry: DirectoryEntryInContext,
      ): string | undefined {
        return entry.name.substring(0, entry.name.length - extension.length);
      },
      loadValue: function (
        entry: DirectoryEntryInContext,
        options?: Readonly<ValueLoaderOptions>,
      ): Promise<string> {
        return fileReader.readTextFromFile(entry.url, options);
      },
    });
  }

  binaryFile(
    options?: Readonly<FileLoaderBuildOptions>,
  ): FluentLoader<Uint8Array> {
    const name = options?.name ?? "Binary file value loader";
    const extension = options?.extension ?? "";
    const fileReader = this.#fileReader;

    return makeFluent<Uint8Array>({
      name: name,
      canLoadValue: function (
        entry: DirectoryEntryInContext,
      ): boolean | Promise<boolean> {
        return entry.name.endsWith(extension);
      },
      computeKey: function (
        entry: DirectoryEntryInContext,
      ): string | undefined {
        return entry.name.substring(0, entry.name.length - extension.length);
      },
      loadValue: function (
        entry: DirectoryEntryInContext,
        options?: Readonly<ValueLoaderOptions>,
      ): Promise<Uint8Array> {
        return fileReader.readBinaryFromFile(entry.url, options);
      },
    });
  }

  jsonFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<unknown> {
    const customOptions =
      (options
        ? Object.fromEntries(Object.entries(options))
        : {}) as FileLoaderBuildOptions as CustomFileLoaderBuildOptions;
    customOptions.parser = JSON.parse;
    customOptions.name = options?.name ?? "JSON file value loader";
    customOptions.extension = options?.extension ?? "";
    return this.customFile(customOptions);
  }

  customFile(
    options: Readonly<CustomFileLoaderBuildOptions>,
  ): FluentLoader<unknown> {
    const name = options.name ?? "Custom file value loader";
    const extension = options.extension ?? "";
    const fileReader = this.#fileReader;
    const parser = options.parser;
    const canLoadValue = options.canLoadValue ??
      ((entry: DirectoryEntryInContext) => entry.name.endsWith(extension));

    return makeFluent({
      name: name,
      canLoadValue: function (
        entry: DirectoryEntryInContext,
      ): boolean | Promise<boolean> {
        return canLoadValue(entry);
      },
      computeKey: function (
        entry: DirectoryEntryInContext,
      ): string | undefined {
        return entry.name.substring(0, entry.name.length - extension.length);
      },
      loadValue: async function (
        entry: DirectoryEntryInContext,
        options?: Readonly<ValueLoaderOptions>,
      ): Promise<unknown> {
        const contents = await fileReader.readTextFromFile(entry.url, options);
        return parser(contents);
      },
    });
  }

  directoryAsObject(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<Record<string, unknown>> {
    return makeFluent(
      new DirectoryObjectValueLoader(
        options.name ?? "Directory object value loader",
        options.loaders,
        this.#directoryContentsReader,
        options.defaultOptions,
      ),
    );
  }

  directoryAsArray(
    options: DirectoryLoaderBuildOptions,
  ): FluentLoader<unknown[]> {
    return makeFluent(
      new DirectoryArrayValueLoader(
        options.name ?? "Directory array value loader",
        options.loaders,
        this.#directoryContentsReader,
        options.defaultOptions,
      ),
    );
  }

  defaults(): FluentLoader<unknown>[] {
    return [
      this.textFile().whenExtensionIs(".txt"),
      this.jsonFile().whenExtensionIs(".json"),
    ];
  }
}
