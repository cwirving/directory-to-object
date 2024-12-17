import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import { test } from "@cross/test";
import { asyncAnd, FluentLoaderImpl, makeFluent } from "./fluent_loader.ts";
import { MockValueLoader } from "./mocks/value_loader.mock.ts";
import type { DirectoryEntryInContext } from "./interfaces.ts";

test("asyncAnd works as expected", async () => {
  assertEquals(await asyncAnd(true, true), true);
  assertEquals(await asyncAnd(true, false), false);
  assertEquals(await asyncAnd(false, true), false);
  assertEquals(await asyncAnd(false, false), false);

  assertEquals(
    await asyncAnd(Promise.resolve(true), Promise.resolve(true)),
    true,
  );
  assertEquals(
    await asyncAnd(Promise.resolve(true), Promise.resolve(false)),
    false,
  );
  assertEquals(
    await asyncAnd(Promise.resolve(false), Promise.resolve(true)),
    false,
  );
  assertEquals(
    await asyncAnd(Promise.resolve(false), Promise.resolve(false)),
    false,
  );

  assertEquals(await asyncAnd(Promise.resolve(true), true), true);
  assertEquals(await asyncAnd(Promise.resolve(true), false), false);
  assertEquals(await asyncAnd(Promise.resolve(false), true), false);
  assertEquals(await asyncAnd(Promise.resolve(false), false), false);

  assertEquals(await asyncAnd(true, Promise.resolve(true)), true);
  assertEquals(await asyncAnd(true, Promise.resolve(false)), false);
  assertEquals(await asyncAnd(false, Promise.resolve(true)), false);
  assertEquals(await asyncAnd(false, Promise.resolve(false)), false);
});

test("FluentLoaderImpl.newLoader creates a frozen loader", async () => {
  const mockLoader = new MockValueLoader("foo");
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  assert(Object.isFrozen(loader));
  assertEquals(loader.name, "foo");
  assertFalse(
    await loader.canLoadValue({
      name: "example.txt",
      relativePath: "/path/to/example.txt",
      type: "file",
      url: new URL("file:///path/to/example.txt"),
    }),
  );
  assertEquals(mockLoader.calls.canLoadValue.length, 1);
});

test("FluentLoaderImpl.canLoadValue works correctly with sync override", async () => {
  const mockValueLoader = new MockValueLoader("foo", {
    canLoadValue: () => true,
  });
  const customLoader = FluentLoaderImpl.newLoader(mockValueLoader, {
    canLoadValue: () => false,
  });

  const result = await customLoader.canLoadValue({
    name: "example.txt",
    relativePath: "/path/to/example.txt",
    type: "file",
    url: new URL("file:///path/to/example.txt"),
  });

  assertEquals(result, false);
});

test("FluentLoaderImpl.canLoadValue works correctly with async override", async () => {
  const mockValueLoader = new MockValueLoader("foo", {
    canLoadValue: () => true,
  });
  const customLoader = FluentLoaderImpl.newLoader(mockValueLoader, {
    canLoadValue: () => Promise.resolve(false),
  });

  const result = await customLoader.canLoadValue({
    name: "example.txt",
    relativePath: "/path/to/example.txt",
    type: "file",
    url: new URL("file:///path/to/example.txt"),
  });

  assertEquals(result, false);
});

test("FluentLoaderImpl.computeKey uses inner loader when no override applied", () => {
  const mockValueLoader = new MockValueLoader("foo");
  const loader = FluentLoaderImpl.newLoader(mockValueLoader);
  const key = loader.computeKey({
    name: "example.txt",
    relativePath: "path/to/example.txt",
    type: "file",
    url: new URL("file:///example.txt"),
  });
  assertEquals(key, "example.txt");
});

test("FluentLoaderImpl.computeKey uses override", () => {
  const mockValueLoader = new MockValueLoader("foo");
  const loader = FluentLoaderImpl.newLoader(mockValueLoader, {
    computeKey: () => "customKey",
  });
  const key = loader.computeKey({
    name: "example.txt",
    relativePath: "path/to/example.txt",
    type: "file",
    url: new URL("file:///example.txt"),
  });
  assertEquals(key, "customKey");
});

test("FluentLoaderImpl.withName creates a new loader with updated name", () => {
  const mockValueLoader = new MockValueLoader("foo");
  const loader = FluentLoaderImpl.newLoader(mockValueLoader).withName(
    "customName",
  );
  assertEquals(loader.name, "customName");
});

test("FluentLoaderImpl.whenExtensionIs applies extension matching correctly", () => {
  const mockValueLoader = new MockValueLoader("foo", {
    canLoadValue: (entry: DirectoryEntryInContext) =>
      entry.name.startsWith("true"),
  });
  const loader = FluentLoaderImpl.newLoader(mockValueLoader).whenExtensionIs(
    ".txt",
  );

  const trueEntry: DirectoryEntryInContext = {
    name: "true.txt",
    relativePath: "path/to/true.txt",
    type: "file",
    url: new URL("file:///true.txt"),
  };

  const result1 = loader.canLoadValue(trueEntry);
  assert(result1);
  assertEquals(loader.computeKey(trueEntry), "true");

  const otherExtensionEntry: DirectoryEntryInContext = {
    name: "true.txt.not_txt",
    relativePath: "path/to/true.txt.not_txt",
    type: "file",
    url: new URL("file:///true.txt.not_txt"),
  };

  const result2 = loader.canLoadValue(otherExtensionEntry);
  assertFalse(result2);

  const falseEntry: DirectoryEntryInContext = {
    name: "false.txt",
    relativePath: "path/to/false.txt",
    type: "file",
    url: new URL("file:///false.txt"),
  };

  const result3 = loader.canLoadValue(falseEntry);
  assertFalse(result3);
});

test("FluentLoaderImpl.whenExtensionIsOneOf applies extension matching correctly", () => {
  const mockValueLoader = new MockValueLoader("foo", {
    canLoadValue: (entry: DirectoryEntryInContext) =>
      entry.name.startsWith("true"),
  });
  const loader = FluentLoaderImpl.newLoader(mockValueLoader)
    .whenExtensionIsOneOf(
      [".abc", ".txt", ".something_else"],
    );

  const trueEntry: DirectoryEntryInContext = {
    name: "true.txt",
    relativePath: "path/to/true.txt",
    type: "file",
    url: new URL("file:///true.txt"),
  };

  const result1 = loader.canLoadValue(trueEntry);
  assert(result1);
  assertEquals(loader.computeKey(trueEntry), "true");

  const otherExtensionEntry: DirectoryEntryInContext = {
    name: "true.txt.not_txt",
    relativePath: "path/to/true.txt.not_txt",
    type: "file",
    url: new URL("file:///true.txt.not_txt"),
  };

  const result2 = loader.canLoadValue(otherExtensionEntry);
  assertFalse(result2);

  const falseEntry: DirectoryEntryInContext = {
    name: "false.txt",
    relativePath: "path/to/false.txt",
    type: "file",
    url: new URL("file:///false.txt"),
  };

  const result3 = loader.canLoadValue(falseEntry);
  assertFalse(result3);
});

test("FluentLoaderImpl.loadValue uses the inner loader's method", async () => {
  const mockValueLoader = new MockValueLoader("foo", {
    contents: { "file:///path/to/example.txt": "example" },
  });
  const loader = FluentLoaderImpl.newLoader(mockValueLoader);

  assertEquals(
    await loader.loadValue({
      name: "example.txt",
      relativePath: "/path/to/example.txt",
      type: "file",
      url: new URL("file:///path/to/example.txt"),
    }),
    "example",
  );

  assertEquals(mockValueLoader.calls.loadValue.length, 1);
});

test("FluentLoaderImpl.when adds synchronous canLoadValue condition", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).when((entry) =>
    entry.name.endsWith(".txt")
  );

  const trueEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "path/file.txt",
    type: "file",
    url: new URL("file:///path/file.txt"),
  };
  const falseEntry: DirectoryEntryInContext = {
    name: "file.jpg",
    relativePath: "path/file.jpg",
    type: "file",
    url: new URL("file:///path/file.jpg"),
  };

  assert(await loader.canLoadValue(trueEntry));
  assertFalse(await loader.canLoadValue(falseEntry));
});

test("FluentLoaderImpl.when adds asynchronous canLoadValue condition", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).when((entry) =>
    Promise.resolve(entry.name.endsWith(".txt"))
  );

  const trueEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "path/file.txt",
    type: "file",
    url: new URL("file:///path/file.txt"),
  };
  const falseEntry: DirectoryEntryInContext = {
    name: "file.jpg",
    relativePath: "path/file.jpg",
    type: "file",
    url: new URL("file:///path/file.jpg"),
  };

  assert(await loader.canLoadValue(trueEntry));
  assertFalse(await loader.canLoadValue(falseEntry));
});

test("FluentLoaderImpl.when combines canLoadValue with inner loader", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.name.startsWith("valid"),
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader).when((entry) =>
    entry.name.endsWith(".txt")
  );

  const trueEntry: DirectoryEntryInContext = {
    name: "valid_file.txt",
    relativePath: "path/valid_file.txt",
    type: "file",
    url: new URL("file:///path/valid_file.txt"),
  };
  const falseEntry1: DirectoryEntryInContext = {
    name: "invalid_file.txt",
    relativePath: "path/invalid_file.txt",
    type: "file",
    url: new URL("file:///path/invalid_file.txt"),
  };
  const falseEntry2: DirectoryEntryInContext = {
    name: "valid_file.jpg",
    relativePath: "path/valid_file.jpg",
    type: "file",
    url: new URL("file:///path/valid_file.jpg"),
  };

  assert(await loader.canLoadValue(trueEntry));
  assertFalse(await loader.canLoadValue(falseEntry1));
  assertFalse(await loader.canLoadValue(falseEntry2));
});

test("FluentLoaderImpl.whenPathMatches applies glob pattern matching", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatches(
    "**/*.txt",
  );

  const matchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "path/to/file.txt",
    type: "file",
    url: new URL("file:///path/to/file.txt"),
  };

  const nonMatchingEntry: DirectoryEntryInContext = {
    name: "file.jpg",
    relativePath: "path/to/file.jpg",
    type: "file",
    url: new URL("file:///path/to/file.jpg"),
  };

  assert(await loader.canLoadValue(matchingEntry));
  assertFalse(await loader.canLoadValue(nonMatchingEntry));
});

test("FluentLoaderImpl.whenPathMatches ensures non-matching paths are ignored", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatches(
    "specific/*/*.txt",
  );

  const matchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "specific/path/file.txt",
    type: "file",
    url: new URL("file:///specific/path/file.txt"),
  };

  const nonMatchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "other/path/file.txt",
    type: "file",
    url: new URL("file:///other/path/file.txt"),
  };

  assert(await loader.canLoadValue(matchingEntry));
  assertFalse(await loader.canLoadValue(nonMatchingEntry));
});

test("FluentLoaderImpl.whenPathMatches does not alter inner loader's functionality", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.name === "allowed.txt",
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatches(
    "path/**/*.txt",
  );

  const validEntry: DirectoryEntryInContext = {
    name: "allowed.txt",
    relativePath: "path/to/allowed.txt",
    type: "file",
    url: new URL("file:///path/to/allowed.txt"),
  };

  const invalidEntry: DirectoryEntryInContext = {
    name: "denied.txt",
    relativePath: "path/to/denied.txt",
    type: "file",
    url: new URL("file:///path/to/denied.txt"),
  };

  assert(await loader.canLoadValue(validEntry));
  assertFalse(await loader.canLoadValue(invalidEntry));
});

test("FluentLoaderImpl.whenPathMatchesEvery ensures all patterns must match", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesEvery([
    "**/*.txt",
    "specific/**/*.txt",
    "**/allowed/**/*.txt",
  ]);

  const matchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "specific/allowed/path/to/file.txt",
    type: "file",
    url: new URL("file:///specific/allowed/path/to/file.txt"),
  };

  const partiallyMatchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "specific/disallowed/path/to/file.txt",
    type: "file",
    url: new URL("file:///specific/disallowed/path/to/file.txt"),
  };

  assert(await loader.canLoadValue(matchingEntry));
  assertFalse(await loader.canLoadValue(partiallyMatchingEntry));
});

test("FluentLoaderImpl.whenPathMatchesEvery works correctly with an empty pattern list", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesEvery(
    [],
  );

  const anyEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "any/path/to/file.txt",
    type: "file",
    url: new URL("file:///any/path/to/file.txt"),
  };

  assert(await loader.canLoadValue(anyEntry));
});

test("FluentLoaderImpl.whenPathMatchesEvery ensures non-matching entries are not loaded", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesEvery([
    "**/*.txt",
    "**/specific/**",
  ]);

  const nonMatchingEntry: DirectoryEntryInContext = {
    name: "file.jpg",
    relativePath: "specific/path/to/file.jpg",
    type: "file",
    url: new URL("file:///specific/path/to/file.jpg"),
  };

  assertFalse(await loader.canLoadValue(nonMatchingEntry));
});

test("FluentLoaderImpl.whenPathMatchesSome ensures at least one pattern must match", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesSome([
    "**/*.txt",
    "specific/**/*.txt",
    "**/allowed/**/*.txt",
  ]);

  const matchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "specific/allowed/path/to/file.txt",
    type: "file",
    url: new URL("file:///specific/allowed/path/to/file.txt"),
  };

  const partiallyMatchingEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "specific/disallowed/path/to/file.txt",
    type: "file",
    url: new URL("file:///specific/disallowed/path/to/file.txt"),
  };

  assert(await loader.canLoadValue(matchingEntry));
  assert(await loader.canLoadValue(partiallyMatchingEntry));
});

test("FluentLoaderImpl.whenPathMatchesSome works correctly with an empty pattern list", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesSome([]);

  const anyEntry: DirectoryEntryInContext = {
    name: "file.txt",
    relativePath: "any/path/to/file.txt",
    type: "file",
    url: new URL("file:///any/path/to/file.txt"),
  };

  assertFalse(await loader.canLoadValue(anyEntry));
});

test("FluentLoaderImpl.whenPathMatchesSome ensures non-matching entries are not loaded", async () => {
  const mockLoader = new MockValueLoader("mock", { canLoadValue: () => true });
  const loader = FluentLoaderImpl.newLoader(mockLoader).whenPathMatchesSome([
    "**/*.txt",
    "**/specific/**",
  ]);

  const nonMatchingEntry: DirectoryEntryInContext = {
    name: "file.jpg",
    relativePath: "other/path/to/file.jpg",
    type: "file",
    url: new URL("file:///other/path/to/file.jpg"),
  };

  assertFalse(await loader.canLoadValue(nonMatchingEntry));
});

test("FluentLoaderImpl.withKeyComputation applies custom logic to pre-existing keys", () => {
  const mockValueLoader = new MockValueLoader("foo", {
    computeKey: (entry) => entry.name.toUpperCase(),
  });
  const loader = FluentLoaderImpl.newLoader(mockValueLoader).withKeyComputation(
    (key) => `computed:${key}`,
  );

  const key = loader.computeKey({
    name: "example.txt",
    relativePath: "path/to/example.txt",
    type: "file",
    url: new URL("file:///example.txt"),
  });

  assertEquals(key, "computed:EXAMPLE.TXT");
});

test("FluentLoaderImpl.withKeyComputation does not override undefined inner keys", () => {
  const mockValueLoader = new MockValueLoader("foo", {
    computeKey: () => undefined,
  });
  const loader = FluentLoaderImpl.newLoader(mockValueLoader).withKeyComputation(
    (key) => `computed:${key}`,
  );

  const key = loader.computeKey({
    name: "example.txt",
    relativePath: "path/to/example.txt",
    type: "file",
    url: new URL("file:///example.txt"),
  });

  assertEquals(key, undefined);
});

test("FluentLoaderImpl.loadDirectory loads directory successfully", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type === "directory",
    contents: { "directory://mockDir": "mockDirectoryContents" },
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  const result = await loader.loadDirectory(new URL("directory://mockDir"));
  assertEquals(result, "mockDirectoryContents");
});

test("FluentLoaderImpl.loadDirectory rejects when inner loader cannot load directory", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type !== "directory",
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  await assertRejects(
    () => loader.loadDirectory(new URL("directory://mockDir")),
    Error,
    'Loader "mock" cannot load directory "directory://mockDir"',
  );
});

test("FluentLoaderImpl.loadDirectory passes options to inner loader", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type === "directory",
    contents: { "directory://mockDir": "mockWithOptions" },
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  const customOptions = { embedDirectoryUrlAs: "url" };
  const result = await loader.loadDirectory(
    new URL("directory://mockDir"),
    customOptions,
  );
  assertEquals(result, "mockWithOptions");
  assertEquals(mockLoader.calls.loadValue.length, 1);
  assertEquals(mockLoader.calls.loadValue[0].options, customOptions);
});

test("FluentLoaderImpl.loadFile loads file successfully", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type === "file",
    contents: { "file:///mockDir": "mockDirectoryContents" },
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  const result = await loader.loadFile(new URL("file:///mockDir"));
  assertEquals(result, "mockDirectoryContents");
});

test("FluentLoaderImpl.loadFile rejects when inner loader cannot load file", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type !== "file",
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  await assertRejects(
    () => loader.loadFile(new URL("file:///mockDir/file.txt")),
    Error,
    'Loader "mock" cannot load file "file:///mockDir/file.txt"',
  );
});

test("FluentLoaderImpl.loadFile passes options to inner loader", async () => {
  const mockLoader = new MockValueLoader("mock", {
    canLoadValue: (entry) => entry.type === "file",
    contents: { "file:///mockDir/file.txt": "mockWithOptions" },
  });
  const loader = FluentLoaderImpl.newLoader(mockLoader);

  const customOptions = { embedDirectoryUrlAs: "url" };
  const result = await loader.loadFile(
    new URL("file:///mockDir/file.txt"),
    customOptions,
  );
  assertEquals(result, "mockWithOptions");
  assertEquals(mockLoader.calls.loadValue.length, 1);
  assertEquals(mockLoader.calls.loadValue[0].options, customOptions);
});

test("makeFluent returns the same FluentLoaderImpl instance if already fluent", () => {
  const loader = FluentLoaderImpl.newLoader(new MockValueLoader("mock"));
  const result = makeFluent(loader);
  assert(loader === result);
});

test("makeFluent wraps a ValueLoader into a FluentLoader", () => {
  const mockLoader = new MockValueLoader("mock");
  const result = makeFluent(mockLoader);
  assertInstanceOf(
    result,
    FluentLoaderImpl as unknown as new (...args: unknown[]) => unknown,
  );
  assertEquals(result.name, "mock");
});
