import { assertEquals, assertExists } from "@std/assert";
import { test } from "@cross/test";
import type {
  DirectoryEntryInContext,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { MockValueLoader } from "./mocks/value_loader.mock.ts";
import { DirectoryValueLoader } from "./directory_loader.ts";
import { MockDirectoryContentsReader } from "./mocks/directory_contents_reader.mock.ts";

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

test("Directory loader honors loader iteration order", async () => {
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
  const mockDirectoryContentsReader = new MockDirectoryContentsReader(
    "reader",
    {},
  );

  const loaders = [
    loader3,
    loader2,
    loader1,
    neverCalledValueLoader,
  ];

  mockDirectoryContentsReader.contents = {
    "file:///": [{
      name: "foo.c",
      type: "file",
      url: new URL("file:///foo.c"),
    }],
  };
  const dv1 = new DirectoryValueLoader(
    "directory loader",
    loaders,
    mockDirectoryContentsReader,
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
  assertExists(returned1);

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
  mockDirectoryContentsReader.contents = {
    "file:///": [{
      name: "foo.b.c",
      type: "file",
      url: new URL("file:///foo.b.c"),
    }],
  };
  const dv2 = new DirectoryValueLoader(
    "directory loader",
    loaders,
    mockDirectoryContentsReader,
  );
  const options2 = {};
  const returned2 = await dv2.loadValue(entry1, options2);

  assertExists(returned1);

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
  mockDirectoryContentsReader.contents = {
    "file:///": [{
      name: "foo.a.b.c",
      type: "file",
      url: new URL("file:///foo.a.b.c"),
    }],
  };
  const dv3 = new DirectoryValueLoader(
    "directory loader",
    loaders,
    mockDirectoryContentsReader,
  );
  const options3 = {};
  const returned3 = await dv3.loadValue(entry1, options2);

  assertExists(returned3);

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

  const entry: DirectoryEntryInContext = {
    name: "",
    relativePath: "",
    url: new URL("file:///dir"),
    type: "directory",
  };

  // Load the object without options
  const dv = new DirectoryValueLoader("dv", [loader], reader);
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
