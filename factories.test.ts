import { test } from "@cross/test";
import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  DefaultLoaderBuilder,
  newDirectoryContentsReader,
  newFileReader,
} from "./factories.ts";
import type { DirectoryEntry, ValueLoaderOptions } from "./interfaces.ts";
import { merge } from "@es-toolkit/es-toolkit";

const builder = new DefaultLoaderBuilder(
  newFileReader(),
  newDirectoryContentsReader(),
);

test("newFileReader: load a file", async () => {
  const reader = newFileReader();

  assertExists(reader, "The text file reader should be created.");

  const fileUrl = new URL(
    "test_data/SimpleDirectory/text.txt",
    import.meta.url,
  );
  const fileContents = await reader.readTextFromFile(fileUrl);
  assertEquals(fileContents, "This is a test\n");
});

test("newFileReader: load a binary file of zeros", async () => {
  const reader = newFileReader();

  assertExists(reader, "The binary file reader should be created.");

  const licenseUrl = new URL(
    "test_data/FileBinaryReader/zeros.bin",
    import.meta.url,
  );
  const fileContents = await reader.readBinaryFromFile(licenseUrl);
  assertExists(fileContents, "The binary file should be loaded.");
  assertEquals(
    fileContents.length,
    16,
    "The binary file has the expected length",
  );

  for (const byte of fileContents) {
    assertEquals(byte, 0, "All bytes must be zero");
  }
});

test("newFileReader: load a binary file of incrementing numbers", async () => {
  const reader = newFileReader();

  assertExists(reader, "The binary file reader should be created.");

  const licenseUrl = new URL(
    "test_data/FileBinaryReader/ramp.bin",
    import.meta.url,
  );
  const fileContents = await reader.readBinaryFromFile(licenseUrl);
  assertExists(fileContents, "The binary file should be loaded.");
  assertEquals(
    fileContents.length,
    32,
    "The binary file has the expected length",
  );

  for (let index = 0; index < 32; ++index) {
    const byte = fileContents[index];
    assertEquals(byte, index, "All bytes must equal the index");
  }
});

test("newDirectoryContentsReader: read a directory (no options)", async () => {
  const directoryReader = newDirectoryContentsReader();

  assertExists(
    directoryReader,
    "The directory contents reader should be created.",
  );

  const testDirectoryUrl = new URL(
    "test_data/DirectoryContentsReader",
    import.meta.url,
  );
  const directoryContents = await directoryReader.readDirectoryContents(
    testDirectoryUrl,
  );

  assertEquals(directoryContents.length, 5);

  const entryMap = new Map<string, DirectoryEntry>();
  for (const entry of directoryContents) {
    entryMap.set(entry.name, entry);
  }

  assertEquals(entryMap.get("file")?.type, "file");
  assertEquals(entryMap.get("directory")?.type, "directory");
  assertEquals(entryMap.get("file_symlink")?.type, "other");
  assertEquals(entryMap.get("directory_symlink")?.type, "other");
  assertEquals(entryMap.get("does_not_exist")?.type, "other");
});

test("newDirectoryContentsReader: read a directory (include symlinks)", async () => {
  const directoryReader = newDirectoryContentsReader();

  assertExists(
    directoryReader,
    "The directory contents reader should be created.",
  );

  const testDirectoryUrl = new URL(
    "test_data/DirectoryContentsReader",
    import.meta.url,
  );
  const directoryContents = await directoryReader.readDirectoryContents(
    testDirectoryUrl,
    { includeSymlinks: true },
  );

  assertEquals(directoryContents.length, 5);

  const entryMap = new Map<string, DirectoryEntry>();
  for (const entry of directoryContents) {
    entryMap.set(entry.name, entry);
  }

  assertEquals(entryMap.get("file")?.type, "file");
  assertEquals(entryMap.get("directory")?.type, "directory");
  assertEquals(entryMap.get("file_symlink")?.type, "file");
  assertEquals(entryMap.get("directory_symlink")?.type, "directory");
  assertEquals(entryMap.get("does_not_exist")?.type, "other");
});

test("newDirectoryContentsReader: read a directory (aborted)", async () => {
  const directoryReader = newDirectoryContentsReader();

  assertExists(
    directoryReader,
    "The directory contents reader should be created.",
  );

  const testDirectoryUrl = new URL(
    "test_data/DirectoryContentsReader",
    import.meta.url,
  );

  await assertRejects(async () => {
    return await directoryReader.readDirectoryContents(
      testDirectoryUrl,
      { signal: AbortSignal.abort("foo") },
    );
  });
});

test("Loaders.defaults returns the expected defaults", async () => {
  const loaders = builder.defaults();

  // Update these when we add more loaders to the defaults.
  assertEquals(loaders.length, 2);

  const txtLoader = loaders.find((loader) =>
    loader.name === "Text file value loader"
  );
  assertExists(txtLoader);
  if (txtLoader) {
    const textValue = await txtLoader.loadValue({
      relativePath: "/text.txt",
      name: "text.txt",
      url: new URL("test_data/SimpleDirectory/text.txt", import.meta.url),
      type: "file",
    });
    assertEquals(textValue, "This is a test\n");

    await assertRejects(async () => {
      return await txtLoader.loadValue({
        relativePath: "/text.txt",
        name: "text.txt",
        url: new URL("test_data/SimpleDirectory/text.txt", import.meta.url),
        type: "file",
      }, { signal: AbortSignal.abort("foo") });
    }, "foo");
  }

  const jsonLoader = loaders.find((loader) =>
    loader.name === "JSON file value loader"
  );
  assertExists(jsonLoader);
  if (jsonLoader) {
    const jsonValue = await jsonLoader.loadValue({
      relativePath: "/json.json",
      name: "json.json",
      url: new URL("test_data/SimpleDirectory/json.json", import.meta.url),
      type: "file",
    });
    assertEquals(jsonValue, { foo: "bar" });

    await assertRejects(async () => {
      return await txtLoader.loadValue({
        relativePath: "/json.json",
        name: "json.json",
        url: new URL("test_data/SimpleDirectory/json.json", import.meta.url),
        type: "file",
      }, { signal: AbortSignal.abort("bar") });
    }, "bar");
  }
});

test("directoryAsObject reads SimpleDirectory", async () => {
  const directoryLoader = builder.directoryAsObject({
    loaders: builder.defaults(),
  });

  const directoryUrl = new URL("test_data/SimpleDirectory", import.meta.url);
  const contents = await directoryLoader.loadDirectory(directoryUrl);

  assertEquals(contents, {
    json: {
      foo: "bar",
    },
    subdirectory: {
      text: "another test\n",
    },
    text: "This is a test\n",
  });
});

test("directoryAsObject reads SimpleDirectory with name decoding", async () => {
  const directoryLoader = builder.directoryAsObject({
    loaders: builder.defaults(),
  });

  const directoryUrl = new URL("test_data/SimpleDirectory", import.meta.url);
  const contents = await directoryLoader.loadDirectory(directoryUrl, {
    // Use a decoder that uppercases names. All the properties loaded from disk will be uppercase, now.
    propertyNameDecoder: (name: string) => name.toUpperCase(),
  });

  assertEquals(contents, {
    JSON: {
      foo: "bar",
    },
    SUBDIRECTORY: {
      TEXT: "another test\n",
    },
    TEXT: "This is a test\n",
  });
});

function verifyMergedContents(contents: Record<string, unknown>) {
  // Node.js returns binary data as a Buffer, which is a Uint8Array subclass.
  const binary = contents["binary"];
  assert(binary instanceof Uint8Array);
  assertEquals(binary.length, 4);
  assertEquals(binary[0], 0);
  assertEquals(binary[1], 255);
  assertEquals(binary[2], 0);
  assertEquals(binary[3], 255);

  // Remove it because we can't directly test equality when the actual value may be a Uint8Array subclass.
  delete contents["binary"];

  assertEquals(contents, {
    test: "This is a test!\n",
    subdirectory: {
      another: "value",
      nested: {
        key: "value",
        key2: "value2",
      },
    },
  });
}

test("directoryAsObject reads CompleteDirectory, using es-toolkit merge function as default options", async () => {
  const loaders = builder.defaults();

  // The merge options we'll use
  const mergeOptions: ValueLoaderOptions = {
    arrayMergeFunction: merge,
    objectMergeFunction: merge,
  };

  loaders.push(builder.binaryFile({ extension: ".bin" }));

  const directoryLoader = builder.directoryAsObject({
    loaders: loaders,
    name: "foo",
    defaultOptions: mergeOptions,
  });

  assertEquals(directoryLoader.name, "foo");

  const directoryUrl = new URL("test_data/CompleteDirectory", import.meta.url);
  const contents = await directoryLoader.loadDirectory(directoryUrl);
  verifyMergedContents(contents);
});

test("directoryAsObject reads CompleteDirectory, using es-toolkit merge function as explicit options", async () => {
  const loaders = builder.defaults();

  // The merge options we'll use
  const mergeOptions: ValueLoaderOptions = {
    arrayMergeFunction: merge,
    objectMergeFunction: merge,
  };

  loaders.push(builder.binaryFile({ extension: ".bin" }));

  const directoryLoader = builder.directoryAsObject({
    loaders: loaders,
    name: "foo",
    // Set some fatal default options, to verify that the merge options are being used.
    defaultOptions: {
      arrayMergeFunction: (_) => {
        throw Error("should never be called");
      },
      objectMergeFunction: (_) => {
        throw Error("should never be called");
      },
    },
  });

  assertEquals(directoryLoader.name, "foo");

  const directoryUrl = new URL("test_data/CompleteDirectory", import.meta.url);
  const contents = await directoryLoader.loadDirectory(
    directoryUrl,
    mergeOptions,
  );
  verifyMergedContents(contents);
});

test("directoryAsArray reads ArrayDirectory", async () => {
  const directoryLoader = builder.directoryAsArray({
    loaders: builder.defaults(),
  });

  const directoryUrl = new URL("test_data/ArrayDirectory", import.meta.url);
  const contents = await directoryLoader.loadDirectory(directoryUrl);

  const expectedContents = ["zero\n"];
  expectedContents[42] = "forty-two\n";
  expectedContents[99] = "ninety-nine\n";
  assertEquals(contents, expectedContents);
});
