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
import { makeFluent } from "./fluent_loaders.ts";
import { DirectoryValueLoader } from "./directory_loader.ts";

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

export class DefaultLoaderBuilder implements LoaderBuilder {
  readonly #fileReader: FileReader;
  readonly #directoryContentsReader: DirectoryContentsReader;

  constructor(
    fileReader: FileReader,
    directoryContentsReader: DirectoryContentsReader,
  ) {
    this.#fileReader = fileReader;
    this.#directoryContentsReader = directoryContentsReader;
  }

  textFile(options?: Readonly<FileLoaderBuildOptions>): FluentLoader<string> {
    const name = options?.name ?? "Text file value loader";
    const extension = options?.extension ?? ".txt";
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
    const extension = options?.extension ?? ".bin";
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
    customOptions.extension = options?.extension ?? ".json";
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
      new DirectoryValueLoader(
        options.name ?? "Directory object value loader",
        options.loaders,
        this.#directoryContentsReader,
        options.defaultOptions,
      ),
    );
  }

  directoryAsArray(
    _options: DirectoryLoaderBuildOptions,
  ): FluentLoader<unknown[]> {
    throw new Error("Method not implemented.");
  }

  defaults(): FluentLoader<unknown>[] {
    return [this.textFile(), this.jsonFile()];
  }
}
