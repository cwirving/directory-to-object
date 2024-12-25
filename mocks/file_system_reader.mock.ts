import type {
  DirectoryEntry,
  FileSystemReader,
  ReadBinaryFromFileOptions,
  ReadDirectoryContentsOptions,
  ReadTextFromFileOptions,
} from "../interfaces.ts";

export interface ReadBinaryFromFileCall {
  path: URL;
  options?: Readonly<ReadBinaryFromFileOptions>;
}

export interface ReadTextFromFileCall {
  path: URL;
  options?: Readonly<ReadTextFromFileOptions>;
}

export interface ReadDirectoryContentsCall {
  path: URL;
  options?: Readonly<ReadDirectoryContentsOptions>;
}

export interface MockFileSystemReaderContents {
  binaryFiles: Record<string, Uint8Array>;
  textFiles: Record<string, string>;
  directories: Record<string, DirectoryEntry[]>;
}

export class MockFileSystemReader implements FileSystemReader {
  name: string;
  contents: MockFileSystemReaderContents = {
    binaryFiles: {},
    textFiles: {},
    directories: {},
  };

  calls: {
    readBinaryFromFile: ReadBinaryFromFileCall[];
    readTextFromFile: ReadTextFromFileCall[];
    readDirectoryContents: ReadDirectoryContentsCall[];
  } = {
    readBinaryFromFile: [],
    readTextFromFile: [],
    readDirectoryContents: [],
  };

  constructor(name: string, contents: MockFileSystemReaderContents) {
    this.name = name;
    this.contents = contents;
  }

  readBinaryFromFile(
    path: URL,
    options?: Readonly<ReadBinaryFromFileOptions>,
  ): Promise<Uint8Array> {
    this.calls.readBinaryFromFile.push({ path, options });

    const result = this.contents.binaryFiles[path.href];
    if (result === undefined) {
      return Promise.reject(
        new Error(`No binary file for ${path.href}`),
      );
    }
    return Promise.resolve(result);
  }

  readTextFromFile(
    path: URL,
    options?: Readonly<ReadTextFromFileOptions>,
  ): Promise<string> {
    this.calls.readTextFromFile.push({ path, options });

    const result = this.contents.textFiles[path.href];
    if (result === undefined) {
      return Promise.reject(
        new Error(`No binary file for ${path.href}`),
      );
    }
    return Promise.resolve(result);
  }

  readDirectoryContents(
    path: URL,
    options?: Readonly<ReadDirectoryContentsOptions>,
  ): Promise<DirectoryEntry[]> {
    this.calls.readDirectoryContents.push({ path, options });

    const result = this.contents.directories[path.href];
    if (result === undefined) {
      return Promise.reject(
        new Error(`No directory contents for ${path.href}`),
      );
    }
    return Promise.resolve(result);
  }
}
