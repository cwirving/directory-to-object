import { test } from "@cross/test";
import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  newBinaryFileValueLoader,
  newDefaultFileValueLoaders,
  newDirectoryContentsReader,
  newDirectoryObjectLoader,
  newFileReader,
} from "./factories.ts";
import type {
  DirectoryEntry,
  DirectoryObjectLoaderOptions,
} from "./interfaces.ts";
import { merge } from "@es-toolkit/es-toolkit";

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
  const directoryContents = await directoryReader.loadDirectoryContents(
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
  const directoryContents = await directoryReader.loadDirectoryContents(
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
    return await directoryReader.loadDirectoryContents(
      testDirectoryUrl,
      { signal: AbortSignal.abort("foo") },
    );
  });
});

test("newDefaultFileValueLoaders: returns the expected defaults", async () => {
  const loaders = newDefaultFileValueLoaders();

  // Update these when we add more loaders to the defaults.
  assertEquals(loaders.size, 2);

  const txtLoader = loaders.get(".txt");
  assertEquals(txtLoader?.name, "Text file value loader");
  if (txtLoader) {
    const textValue = await txtLoader.loadValueFromFile(
      new URL("test_data/SimpleDirectory/text.txt", import.meta.url),
    );
    assertEquals(textValue, "This is a test\n");

    await assertRejects(async () => {
      return await txtLoader.loadValueFromFile(
        new URL("test_data/SimpleDirectory/text.txt", import.meta.url),
        { signal: AbortSignal.abort("foo") },
      );
    });
  }

  const jsonLoader = loaders.get(".json");
  assertEquals(jsonLoader?.name, "JSON file value loader");
  if (jsonLoader) {
    const jsonValue = await jsonLoader.loadValueFromFile(
      new URL("test_data/SimpleDirectory/json.json", import.meta.url),
    );
    assertEquals(jsonValue, { foo: "bar" });

    await assertRejects(async () => {
      return await jsonLoader.loadValueFromFile(
        new URL("test_data/SimpleDirectory/json.json", import.meta.url),
        { signal: AbortSignal.abort("bar") },
      );
    });
  }
});

test("newDirectoryObjectLoader reads SimpleDirectory", async () => {
  const directoryLoader = newDirectoryObjectLoader(
    newDefaultFileValueLoaders(),
  );

  const directoryUrl = new URL("test_data/SimpleDirectory", import.meta.url);
  const contents = await directoryLoader.loadObjectFromDirectory(directoryUrl);

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

test("newDirectoryObjectLoader reads SimpleDirectory with name decoding", async () => {
  const directoryLoader = newDirectoryObjectLoader(
    newDefaultFileValueLoaders(),
  );

  const directoryUrl = new URL("test_data/SimpleDirectory", import.meta.url);
  const contents = await directoryLoader.loadObjectFromDirectory(directoryUrl, {
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

test("newDirectoryObjectLoader reads CompleteDirectory, using es-toolkit merge function as default options", async () => {
  const loaders = newDefaultFileValueLoaders();

  // The merge options we'll use
  const mergeOptions: DirectoryObjectLoaderOptions = {
    arrayMergeFunction: merge,
    objectMergeFunction: merge,
  };

  // Also demonstrate how to add additional loaders:
  const binaryReader = newFileReader();
  loaders.set(".bin", newBinaryFileValueLoader(binaryReader));

  const directoryLoader = newDirectoryObjectLoader(
    loaders,
    newDirectoryContentsReader(),
    "foo",
    mergeOptions,
  );

  assertEquals(directoryLoader.name, "foo");

  const directoryUrl = new URL("test_data/CompleteDirectory", import.meta.url);
  const contents = await directoryLoader.loadObjectFromDirectory(directoryUrl);
  verifyMergedContents(contents);
});

test("newDirectoryObjectLoader reads CompleteDirectory, using es-toolkit merge function as explicit options", async () => {
  const loaders = newDefaultFileValueLoaders();

  // The merge options we'll use
  const mergeOptions: DirectoryObjectLoaderOptions = {
    arrayMergeFunction: merge,
    objectMergeFunction: merge,
  };

  // Also demonstrate how to add additional loaders:
  const binaryReader = newFileReader();
  loaders.set(".bin", newBinaryFileValueLoader(binaryReader));

  const directoryLoader = newDirectoryObjectLoader(
    loaders,
    newDirectoryContentsReader(),
    "foo",
    {
      arrayMergeFunction: (_) => {
        throw Error("should never be called");
      },
      objectMergeFunction: (_) => {
        throw Error("should never be called");
      },
    },
  );

  assertEquals(directoryLoader.name, "foo");

  const directoryUrl = new URL("test_data/CompleteDirectory", import.meta.url);
  const contents = await directoryLoader.loadObjectFromDirectory(
    directoryUrl,
    mergeOptions,
  );
  verifyMergedContents(contents);
});
