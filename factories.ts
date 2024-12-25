/**
 * The functions in this module are the lower-level implementation details of the public API. They allow advanced
 * consumers to control precisely how the library interacts with the file system or provide their own file system-like
 * implementations.
 *
 * @module
 */
import type { FileSystemReader, LoaderBuilder } from "./interfaces.ts";
import { platform } from "./platform.ts";
import { DefaultLoaderBuilder } from "./loader_builder.ts";

/**
 * Create a new file reader appropriate for reading local files and directories on the current platform.
 *
 * File readers don't interpret the contents of the file they read, they just return them as-is.
 *
 * @returns An object implementing the {@link FileSystemReader} interface.
 */
export function newFileSystemReader(): FileSystemReader {
  return platform.fileSystemReader;
}

/**
 * Create a new {@linkcode LoaderBuilder} implementation for the specified file system reader. This
 * fluent builder can then be used to create specific instances of the various loaders in the library.
 *
 * @param fileSystemReader The file system reader to use in the loaders.
 */
export function newLoaderBuilder(
  fileSystemReader: FileSystemReader,
): LoaderBuilder {
  return new DefaultLoaderBuilder(fileSystemReader);
}
