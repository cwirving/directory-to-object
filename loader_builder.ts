import type {
  CustomFileLoaderBuildOptions,
  DirectoryEntryInContext,
  DirectoryLoaderBuildOptions,
  FileLoaderBuildOptions,
  FileSystemReader,
  FluentLoader,
  LoaderBuilder,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { makeFluent } from "./fluent_loader.ts";
import {
  DirectoryArrayValueLoader,
  DirectoryObjectValueLoader,
} from "./directory_loader.ts";

/**
 * The concrete implementation of the {@linkcode LoaderBuilder} interface exposed by this library.
 * It creates the file and directory loaders known to the library.
 */
export class DefaultLoaderBuilder implements LoaderBuilder {
  readonly #fileSystemReader: FileSystemReader;

  /**
   * Constructs an instance of the class with its required readers.
   *
   * @param fileSystemReader - The object responsible for reading files and directories.
   */
  constructor(
    fileSystemReader: FileSystemReader,
  ) {
    this.#fileSystemReader = fileSystemReader;
  }

  textFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<string> {
    const name = options?.name ?? "Text file value loader";
    const extension = options?.extension ?? "";
    const fileSystemReader = this.#fileSystemReader;

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
        const actualFileSystemReader = options?.fileSystemReader ??
          fileSystemReader;
        return actualFileSystemReader.readTextFromFile(entry.url, options);
      },
    });
  }

  binaryFile(
    options?: Readonly<FileLoaderBuildOptions>,
  ): FluentLoader<Uint8Array> {
    const name = options?.name ?? "Binary file value loader";
    const extension = options?.extension ?? "";
    const fileSystemReader = this.#fileSystemReader;

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
        const actualFileSystemReader = options?.fileSystemReader ??
          fileSystemReader;
        return actualFileSystemReader.readBinaryFromFile(entry.url, options);
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
    const fileSystemReader = this.#fileSystemReader;
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
        const actualFileSystemReader = options?.fileSystemReader ??
          fileSystemReader;
        const contents = await actualFileSystemReader.readTextFromFile(
          entry.url,
          options,
        );
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
        this.#fileSystemReader,
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
        this.#fileSystemReader,
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
