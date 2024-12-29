import { assert, assertEquals, assertRejects } from "@std/assert";
import { test } from "@cross/test";
import type {
  DirectoryEntryInContext,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { MockValueLoader } from "./mocks/value_loader.mock.ts";
import {
  DirectoryArrayValueLoader,
  DirectoryObjectValueLoader,
} from "./directory_loader.ts";
import { MockFileSystemReader } from "./mocks/file_system_reader.mock.ts";
import { isRecord } from "./is_record.ts";
import { newLoaderBuilder } from "./factories.ts";

const neverCalledValueLoader: ValueLoader<unknown> = {
  name: "never called",
  canLoadValue: function (
    _entry: DirectoryEntryInContext,
  ): boolean | Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  computeKey: function (_entry: DirectoryEntryInContext): string | undefined {
    throw new Error("Function not implemented.");
  },
  loadValue: function (
    _entry: DirectoryEntryInContext,
    _options?: Readonly<ValueLoaderOptions>,
  ): Promise<unknown> {
    throw new Error("Function not implemented.");
  },
};

test("Directory loader honors loader order", async () => {
  const loader1 = new MockValueLoader("loader 1", {
    contents: { "file:///foo.c": 1 },
    canLoadValue: (entry) => entry.name.endsWith(".c"),
  });
  const loader2 = new MockValueLoader("loader 2", {
    contents: { "file:///foo.b.c": 2 },
    canLoadValue: (entry) => entry.name.endsWith(".b.c"),
  });
  const loader3 = new MockValueLoader("loader 3", {
    contents: {
      "file:///foo.a.b.c": 3,
    },
    canLoadValue: (entry) => entry.url.pathname.endsWith(".a.b.c"),
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    { binaryFiles: {}, directories: {}, textFiles: {}, withDispose: true },
  );

  const loaders = [
    loader3,
    loader2,
    loader1,
    neverCalledValueLoader,
  ];

  mockFileSystemReader.contents = {
    binaryFiles: {},
    directories: {
      "file:///": [{
        name: "foo.c",
        type: "file",
        url: new URL("file:///foo.c"),
      }],
    },
    textFiles: {},
  };
  const dv1 = new DirectoryObjectValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const abortController = new AbortController();
  const entry1: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  const options1 = { signal: abortController.signal };
  const returned1 = await dv1.loadValue(entry1, options1);
  assert(isRecord(returned1));
  assert(mockFileSystemReader.calls.readDirectoryContents.at(-1)?.disposed);

  assertEquals(returned1["foo.c"], 1);
  assertEquals(loader1.calls.canLoadValue.length, 1);
  assertEquals(loader2.calls.canLoadValue.length, 1);
  assertEquals(loader3.calls.canLoadValue.length, 1);
  assertEquals(loader1.calls.computeKey.length, 1);
  assertEquals(loader2.calls.computeKey.length, 0);
  assertEquals(loader3.calls.computeKey.length, 0);
  assertEquals(loader1.calls.loadValue.length, 1);
  assertEquals(loader2.calls.loadValue.length, 0);
  assertEquals(loader3.calls.loadValue.length, 0);

  assertEquals(loader1.calls.canLoadValue[0].entry.name, "foo.c");
  assertEquals(loader1.calls.canLoadValue[0].entry.relativePath, "/foo.c");
  assertEquals(
    loader1.calls.canLoadValue[0].entry.url,
    new URL("file:///foo.c"),
  );
  assertEquals(loader1.calls.canLoadValue[0].entry.type, "file");

  assertEquals(loader1.calls.computeKey[0].entry.name, "foo.c");

  assertEquals(loader1.calls.loadValue[0].entry.name, "foo.c");
  assertEquals(loader1.calls.loadValue[0].options, options1);

  loader1.reset();
  loader2.reset();
  loader3.reset();
  mockFileSystemReader.contents = {
    binaryFiles: {},
    directories: {
      "file:///": [{
        name: "foo.b.c",
        type: "file",
        url: new URL("file:///foo.b.c"),
      }],
    },
    textFiles: {},
  };
  const dv2 = new DirectoryObjectValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const options2 = {};
  const returned2 = await dv2.loadValue(entry1, options2);
  assert(isRecord(returned2));
  assert(mockFileSystemReader.calls.readDirectoryContents.at(-1)?.disposed);

  assertEquals(returned2["foo.b.c"], 2);
  assertEquals(loader1.calls.canLoadValue.length, 0);
  assertEquals(loader2.calls.canLoadValue.length, 1);
  assertEquals(loader3.calls.canLoadValue.length, 1);
  assertEquals(loader1.calls.computeKey.length, 0);
  assertEquals(loader2.calls.computeKey.length, 1);
  assertEquals(loader3.calls.computeKey.length, 0);
  assertEquals(loader1.calls.loadValue.length, 0);
  assertEquals(loader2.calls.loadValue.length, 1);
  assertEquals(loader3.calls.loadValue.length, 0);

  assertEquals(loader2.calls.computeKey[0].entry.name, "foo.b.c");

  assertEquals(loader2.calls.loadValue[0].entry.name, "foo.b.c");
  assertEquals(loader2.calls.loadValue[0].options, options2);

  loader1.reset();
  loader2.reset();
  loader3.reset();
  mockFileSystemReader.contents = {
    binaryFiles: {},
    directories: {
      "file:///": [{
        name: "foo.a.b.c",
        type: "file",
        url: new URL("file:///foo.a.b.c"),
      }],
    },
    textFiles: {},
  };
  const dv3 = new DirectoryObjectValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const options3 = {};
  const returned3 = await dv3.loadValue(entry1, options2);
  assert(isRecord(returned3));
  assert(mockFileSystemReader.calls.readDirectoryContents.at(-1)?.disposed);

  assertEquals(returned3["foo.a.b.c"], 3);
  assertEquals(loader1.calls.canLoadValue.length, 0);
  assertEquals(loader2.calls.canLoadValue.length, 0);
  assertEquals(loader3.calls.canLoadValue.length, 1);
  assertEquals(loader1.calls.computeKey.length, 0);
  assertEquals(loader2.calls.computeKey.length, 0);
  assertEquals(loader3.calls.computeKey.length, 1);
  assertEquals(loader1.calls.loadValue.length, 0);
  assertEquals(loader2.calls.loadValue.length, 0);
  assertEquals(loader3.calls.loadValue.length, 1);

  assertEquals(loader3.calls.computeKey[0].entry.name, "foo.a.b.c");

  assertEquals(loader3.calls.loadValue[0].entry.name, "foo.a.b.c");
  assertEquals(loader3.calls.loadValue[0].options, options3);
});

test("Directory loader uses inner file system reader", async () => {
  const innerReader = new MockFileSystemReader("inner reader", {
    binaryFiles: {},
    directories: {},
    textFiles: {
      "file:///foo.txt": "xyz",
    },
  });
  const outerReader = new MockFileSystemReader("inner reader", {
    binaryFiles: {},
    directories: {
      "file:///": [{
        name: "foo.txt",
        type: "file",
        url: new URL("file:///foo.txt"),
      }],
    },
    textFiles: {},
    innerFileSystemReader: innerReader,
  });

  const loaderBuilder = newLoaderBuilder(outerReader);

  const dv = new DirectoryObjectValueLoader(
    "directory loader",
    loaderBuilder.defaults(),
    outerReader,
  );

  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };

  const returned = await dv.loadValue(entry);
  assertEquals(returned, {
    "foo": "xyz",
  });
});

test("DirectoryValueLoader honors options", async () => {
  const loader = new MockValueLoader("loader", {
    contents: {
      "file:///dir/a.txt": "a",
      "file:///dir/b.txt": "b",
      "file:///dir/c/d.txt": "d",
      "file:///dir/e.json": { f: 42 },
    },
    computeKey: (entry: DirectoryEntryInContext) => {
      const dotIndex = entry.name.indexOf(".");
      return (dotIndex >= 0) ? entry.name.substring(0, dotIndex) : entry.name;
    },
  });

  const reader = new MockFileSystemReader("reader", {
    binaryFiles: {},
    directories: {
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
    },
    textFiles: {},
  });

  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///dir"),
    type: "directory",
  };

  // Load the object without options
  const dv = new DirectoryObjectValueLoader("dv", [loader], reader);
  const noOptionsResult = await dv.loadValue(entry);

  assertEquals(noOptionsResult, {
    a: "a",
    b: "b",
    c: {
      d: "d",
    },
    e: { f: 42 },
  });

  // Load the object while embedding directory URLs
  const embedDirectoryURLResult = await dv.loadValue(entry, {
    embedDirectoryUrlAs: "__dir__",
  });

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
  const embedFileURLResult = await dv.loadValue(entry, {
    embedFileUrlAs: "__file__",
  });

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

test("Array directory loader creates arrays", async () => {
  const loader = new MockValueLoader("loader 1", {
    contents: { "file:///foo": 1, "file:///bar": 2, "file:///baz": 3 },
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    {
      binaryFiles: {},
      directories: {
        "file:///": [{
          name: "foo",
          type: "file",
          url: new URL("file:///foo"),
        }, {
          name: "bar",
          type: "file",
          url: new URL("file:///bar"),
        }, {
          name: "baz",
          type: "file",
          url: new URL("file:///baz"),
        }],
      },
      textFiles: {},
    },
  );

  const loaders = [loader];

  const dv = new DirectoryArrayValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  const returned = await dv.loadValue(entry);
  assert(Array.isArray(returned));

  // Because the directory entries are sorted by name, regardless of original order.
  assertEquals(returned, [2, 3, 1]);
});

test("Array directory loader creates sparse arrays when names are numbers", async () => {
  const loader = new MockValueLoader("loader 1", {
    contents: { "file:///0": 1, "file:///42": 2, "file:///99": 3 },
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    {
      binaryFiles: {},
      directories: {
        "file:///": [{
          name: "0",
          type: "file",
          url: new URL("file:///0"),
        }, {
          name: "42",
          type: "file",
          url: new URL("file:///42"),
        }, {
          name: "99",
          type: "file",
          url: new URL("file:///99"),
        }],
      },
      textFiles: {},
    },
  );

  const loaders = [loader];

  const dv = new DirectoryArrayValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  const returned = await dv.loadValue(entry);
  assert(Array.isArray(returned));

  assertEquals(returned.length, 100);
  assertEquals(returned[0], 1);
  assertEquals(returned[42], 2);
  assertEquals(returned[99], 3);
});

test("Array directory loader creates sparse arrays when names are numbers, even with extensions", async () => {
  // The mock loader strips off the extension, like a real loader would.
  const loader = new MockValueLoader("loader 1", {
    contents: {
      "file:///9.json": 1,
      "file:///42.json": 2,
      "file:///99.json": 3,
    },
    computeKey: (entry: DirectoryEntryInContext) => {
      const dotIndex = entry.name.indexOf(".");
      return (dotIndex >= 0) ? entry.name.substring(0, dotIndex) : entry.name;
    },
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    {
      binaryFiles: {},
      directories: {
        "file:///": [{
          name: "9.json",
          type: "file",
          url: new URL("file:///9.json"),
        }, {
          name: "42.json",
          type: "file",
          url: new URL("file:///42.json"),
        }, {
          name: "99.json",
          type: "file",
          url: new URL("file:///99.json"),
        }],
      },
      textFiles: {},
    },
  );

  const loaders = [loader];

  const dv = new DirectoryArrayValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  const returned = await dv.loadValue(entry);
  assert(Array.isArray(returned));

  assertEquals(returned.length, 100);
  assertEquals(returned[9], 1);
  assertEquals(returned[42], 2);
  assertEquals(returned[99], 3);
});

test("Array directory loader puts non-numeric entries after numbers in loaded sparse arrays", async () => {
  const loader = new MockValueLoader("loader 1", {
    contents: { "file:///0": 1, "file:///42": 2, "file:///a": 3 },
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    {
      binaryFiles: {},
      directories: {
        "file:///": [{
          name: "0",
          type: "file",
          url: new URL("file:///0"),
        }, {
          name: "a",
          type: "file",
          url: new URL("file:///a"),
        }, {
          name: "42",
          type: "file",
          url: new URL("file:///42"),
        }],
      },
      textFiles: {},
    },
  );

  const loaders = [loader];

  const dv = new DirectoryArrayValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  const returned = await dv.loadValue(entry);
  assert(Array.isArray(returned));

  assertEquals(returned.length, 44);
  assertEquals(returned[0], 1);
  assertEquals(returned[42], 2);
  assertEquals(returned[43], 3);
});

function setupTestArrayDirectoryLoader() {
  const loader = new MockValueLoader("loader 1", {
    contents: { "file:///foo": 1, "file:///bar": 2, "file:///baz": 3 },
    canLoadValue: (entry) => entry.name !== "bar",
  });
  const mockFileSystemReader = new MockFileSystemReader(
    "reader",
    {
      binaryFiles: {},
      directories: {
        "file:///": [{
          name: "foo",
          type: "file",
          url: new URL("file:///foo"),
        }, {
          name: "bar",
          type: "file",
          url: new URL("file:///bar"),
        }, {
          name: "baz",
          type: "file",
          url: new URL("file:///baz"),
        }],
      },
      textFiles: {},
    },
  );

  const loaders = [loader];

  const dv = new DirectoryArrayValueLoader(
    "directory loader",
    loaders,
    mockFileSystemReader,
  );
  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///"),
    type: "directory",
  };
  return { dv, entry };
}

test("Array directory loader skips entries rejected by loaders", async () => {
  const { dv, entry } = setupTestArrayDirectoryLoader();

  const returned = await dv.loadValue(entry);
  assert(Array.isArray(returned));

  // Because the directory entries are sorted by name, regardless of original order.
  assertEquals(returned, [3, 1]);
});

test("Array directory implements strict mode", async () => {
  const { dv, entry } = setupTestArrayDirectoryLoader();

  await assertRejects(() => dv.loadValue(entry, { strict: true }));
});
