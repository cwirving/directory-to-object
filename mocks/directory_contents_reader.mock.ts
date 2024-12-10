import type { DirectoryContentsReader, DirectoryEntry, DirectoryContentsReaderOptions } from '../interfaces.ts';

export interface LoadDirectoryContentsCall {
  path: URL;
  options?: Readonly<DirectoryContentsReaderOptions>;
}

export class MockDirectoryContentsReader implements DirectoryContentsReader {
  name: string;
  contents: Record<string, DirectoryEntry[]> = {};

  calls: LoadDirectoryContentsCall[] = [];

  constructor(name: string, contents: Record<string, DirectoryEntry[]>) {
    this.name = name;
    this.contents = contents;
  }

  loadDirectoryContents(path: URL, options?: Readonly<DirectoryContentsReaderOptions>): Promise<DirectoryEntry[]> {
    this.calls.push({path, options});
    const result = this.contents[path.href];
    if(result === undefined) {
      return Promise.reject(new Error(`No directory contents for ${path.href}`));
    }
    return Promise.resolve(result);
  }
}
