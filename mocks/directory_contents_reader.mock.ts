import type {
  DirectoryContentsReader,
  DirectoryContentsReaderOptions,
  DirectoryEntry,
} from "../interfaces.ts";

export interface readDirectoryContentsCall {
  path: URL;
  options?: Readonly<DirectoryContentsReaderOptions>;
}

export class MockDirectoryContentsReader implements DirectoryContentsReader {
  name: string;
  contents: Record<string, DirectoryEntry[]> = {};

  calls: readDirectoryContentsCall[] = [];

  constructor(name: string, contents: Record<string, DirectoryEntry[]>) {
    this.name = name;
    this.contents = contents;
  }

  readDirectoryContents(
    path: URL,
    options?: Readonly<DirectoryContentsReaderOptions>,
  ): Promise<DirectoryEntry[]> {
    this.calls.push({ path, options });
    const result = this.contents[path.href];
    if (result === undefined) {
      return Promise.reject(
        new Error(`No directory contents for ${path.href}`),
      );
    }
    return Promise.resolve(result);
  }
}
