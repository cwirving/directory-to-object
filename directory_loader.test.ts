import { test } from "@cross/test";
import type {
  DirectoryContentsReader,
  DirectoryContentsReaderOptions,
  DirectoryEntry,
  FileValueLoader,
  FileValueLoaderOptions,
} from "./interfaces.ts";
import {
  isRecord,
  loadObjectFromDirectoryEx,
  loadValueFromFile,
  validateLoaders,
} from "./directory_loader.ts";
import { assertEquals, assertThrows, fail } from "@std/assert";

const neverCalledFileValueLoader: FileValueLoader = {
  name: "no-op",
  loadValueFromFile: function (
    _path: URL,
    _options?: FileValueLoaderOptions,
  ): Promise<unknown> {
    throw new Error("Function not implemented.");
  },
};

class MockFileValueLoader implements FileValueLoader {
  readonly name: string;
  readonly contents: Record<string, unknown>;
  callCount = 0;
  lastPath: URL | undefined;
  lastOptions: FileValueLoaderOptions | undefined;

  constructor(name: string, contents: Record<string, unknown>) {
    this.name = name;
    this.contents = contents;
  }

  loadValueFromFile(
    path: URL,
    options?: FileValueLoaderOptions,
  ): Promise<unknown> {
    this.lastPath = path;
    this.lastOptions = options;
    this.callCount += 1;

    const result = this.contents[path.href];
    if (!result) {
      throw new Error(`Unknown URL in mock file value loader: "${path.href}"`);
    }

    return Promise.resolve(result);
  }
}

class MockDirectoryContentsReader implements DirectoryContentsReader {
  readonly name: string;
  readonly contents: Record<string, DirectoryEntry[]>;

  constructor(name: string, contents: Record<string, DirectoryEntry[]>) {
    this.name = name;
    this.contents = contents;
  }

  loadDirectoryContents(
    path: URL,
    _options?: DirectoryContentsReaderOptions,
  ): Promise<DirectoryEntry[]> {
    const result = this.contents[path.href];
    if (!result) {
      throw new Error(
        `Unknown URL in mock directory contents reader: "${path.href}"`,
      );
    }

    return Promise.resolve(result);
  }
}

test("validateLoaders", () => {
  // An empty array should be OK.
  validateLoaders([]);

  // Some good examples
  validateLoaders([
    [".a", neverCalledFileValueLoader],
    [".abc", neverCalledFileValueLoader],
    [".a.b.c", neverCalledFileValueLoader],
  ]);

  // Known-bad examples
  assertThrows(() => {
    validateLoaders([["", neverCalledFileValueLoader]]);
  });
  assertThrows(() => {
    validateLoaders([["a", neverCalledFileValueLoader]]);
  });
  assertThrows(() => {
    validateLoaders([[".a.", neverCalledFileValueLoader]]);
  });
  assertThrows(() => {
    validateLoaders([["abc", neverCalledFileValueLoader]]);
  });
  assertThrows(() => {
    validateLoaders([[".a b", neverCalledFileValueLoader]]);
  });
  assertThrows(() => {
    validateLoaders([[".a .b", neverCalledFileValueLoader]]);
  });
});

test("isRecord", () => {
  assertEquals(isRecord(undefined), false);
  assertEquals(isRecord(null), false);
  assertEquals(isRecord(123), false);
  assertEquals(isRecord("abc"), false);
  assertEquals(isRecord(["abc", "def"]), false);
  assertEquals(isRecord({}), true);
  assertEquals(isRecord({ abc: "def" }), true);
  assertEquals(isRecord(new URL("http://xyz.zyx")), false);

  class Something {
    a = 123;
    b = 456;
  }
  assertEquals(isRecord(new Something()), false);
});

test("loadValueFromFile honors loader iteration order", async () => {
  const loader1 = new MockFileValueLoader("loader 1", { "file:///foo.c": 1 });
  const loader2 = new MockFileValueLoader("loader 2", { "file:///foo.b.c": 2 });
  const loader3 = new MockFileValueLoader("loader 3", {
    "file:///foo.a.b.c": 3,
  });

  const loaders: [string, FileValueLoader][] = [
    [".a.b.c", loader3],
    [".b.c", loader2],
    [".c", loader1],
  ];

  const abortController = new AbortController();
  const url1 = new URL("file:///foo.c");
  const options1 = { signal: abortController.signal };
  const returned1 = await loadValueFromFile("foo.c", url1, loaders, options1);
  if (returned1 === undefined) fail("loadValueFromFile() should return a pair");
  const [key1, value1] = returned1;
  assertEquals(key1, "foo");
  assertEquals(value1, 1);
  assertEquals(loader1.callCount, 1);
  assertEquals(loader2.callCount, 0);
  assertEquals(loader3.callCount, 0);
  assertEquals(loader1.lastPath, url1);
  assertEquals(loader1.lastOptions, options1);

  const url2 = new URL("file:///foo.b.c");
  const options2 = {};
  const returned2 = await loadValueFromFile("foo.b.c", url2, loaders, options2);
  if (returned2 === undefined) fail("loadValueFromFile() should return a pair");
  const [key2, value2] = returned2;
  assertEquals(key2, "foo");
  assertEquals(value2, 2);
  assertEquals(loader1.callCount, 1);
  assertEquals(loader2.callCount, 1);
  assertEquals(loader3.callCount, 0);
  assertEquals(loader2.lastPath, url2);
  assertEquals(loader2.lastOptions, options2);

  const url3 = new URL("file:///foo.a.b.c");
  const returned3 = await loadValueFromFile("foo.a.b.c", url3, loaders);
  if (returned3 === undefined) fail("loadValueFromFile() should return a pair");
  const [key3, value3] = returned3;
  assertEquals(key3, "foo");
  assertEquals(value3, 3);
  assertEquals(loader1.callCount, 1);
  assertEquals(loader2.callCount, 1);
  assertEquals(loader3.callCount, 1);
  assertEquals(loader3.lastPath, url3);
  assertEquals(loader3.lastOptions, undefined);
});

test("loadValueFromFile returns undefined on no match", async () => {
  const loader1 = new MockFileValueLoader("loader 1", { "file:///foo.c": 1 });

  const loaders: [string, FileValueLoader][] = [
    [".c", loader1],
  ];

  assertEquals(
    await loadValueFromFile("foo.xyz", new URL("file:///foo.xyz"), loaders),
    undefined,
  );
});

test("loadObjectFromDirectoryEx", async () => {
  const loader = new MockFileValueLoader("loader", {
    "file:///dir/a.txt": "a",
    "file:///dir/b.txt": "b",
    "file:///dir/c/d.txt": "d",
    "file:///dir/e.json": { f: 42 },
  });
  const loaders: [string, FileValueLoader][] = [[".txt", loader], [
    ".json",
    loader,
  ]];

  const reader = new MockDirectoryContentsReader("reader", {
    "file:///dir": [{
      name: "a.txt",
      type: "file",
      url: new URL("file:///dir/a.txt"),
    }, {
      name: "b.txt",
      type: "file",
      url: new URL("file:///dir/b.txt"),
    }, {
      name: "c",
      type: "directory",
      url: new URL("file:///dir/c"),
    }, {
      name: "e.json",
      type: "file",
      url: new URL("file:///dir/e.json"),
    }, {
      name: "x",
      type: "other",
      url: new URL("file:///dir/x"),
    }],
    "file:///dir/c": [{
      name: "d.txt",
      type: "file",
      url: new URL("file:///dir/c/d.txt"),
    }],
  });

  // Load the object without options
  const noOptionsResult = await loadObjectFromDirectoryEx(
    new URL("file:///dir"),
    loaders,
    reader,
  );

  assertEquals(noOptionsResult, {
    a: "a",
    b: "b",
    c: {
      d: "d",
    },
    e: { f: 42 },
  });

  // Load the object while embedding directory URLs
  const embedDirectoryURLResult = await loadObjectFromDirectoryEx(
    new URL("file:///dir"),
    loaders,
    reader,
    { embedDirectoryUrlAs: "__dir__" },
  );

  assertEquals(embedDirectoryURLResult, {
    __dir__: new URL("file:///dir"),
    a: "a",
    b: "b",
    c: {
      __dir__: new URL("file:///dir/c"),
      d: "d",
    },
    e: { f: 42 },
  });

  // Load the object while embedding directory URLs
  const embedFileURLResult = await loadObjectFromDirectoryEx(
    new URL("file:///dir"),
    loaders,
    reader,
    { embedFileUrlAs: "__file__" },
  );

  assertEquals(embedFileURLResult, {
    a: "a",
    b: "b",
    c: {
      d: "d",
    },
    e: {
      __file__: new URL("file:///dir/e.json"),
      f: 42,
    },
  });
});
