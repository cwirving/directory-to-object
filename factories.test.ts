import { test } from "@cross/test";
import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  newDefaultFileValueLoaders,
  newDirectoryContentsReader,
  newFileBinaryLoader,
  newFileTextLoader,
} from "./factories.ts";
import type { DirectoryEntry } from "./interfaces.ts";

test("newFileTextLoader: load a file", async () => {
  const loader = await newFileTextLoader();

  assertExists(loader, "The text file loader should be created.");

  const licenseUrl = new URL("LICENSE", import.meta.url);
  const licenseContents = await loader.loadTextFromFile(licenseUrl);
  assertExists(licenseContents, "The text file should be loaded.");
  assert(
    licenseContents.startsWith("MIT License"),
    "The file contents should be as expected",
  );
});

test("newFileBinaryLoader: load a file of zeros", async () => {
  const loader = await newFileBinaryLoader();

  assertExists(loader, "The binary file loader should be created.");

  const licenseUrl = new URL(
    "test_data/FileBinaryLoader/zeros.bin",
    import.meta.url,
  );
  const fileContents = await loader.loadBinaryFromFile(licenseUrl);
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

test("newFileBinaryLoader: load a file of incrementing numbers", async () => {
  const loader = await newFileBinaryLoader();

  assertExists(loader, "The binary file loader should be created.");

  const licenseUrl = new URL(
    "test_data/FileBinaryLoader/ramp.bin",
    import.meta.url,
  );
  const fileContents = await loader.loadBinaryFromFile(licenseUrl);
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
  const directoryReader = await newDirectoryContentsReader();

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
  const directoryReader = await newDirectoryContentsReader();

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
  const directoryReader = await newDirectoryContentsReader();

  assertExists(
    directoryReader,
    "The directory contents reader should be created.",
  );

  const testDirectoryUrl = new URL(
    "test_data/DirectoryContentsReader",
    import.meta.url,
  );

  assertRejects(async () => {
    return await directoryReader.loadDirectoryContents(
      testDirectoryUrl,
      { signal: AbortSignal.abort("foo") },
    );
  });
});

test("newDefaultFileValueLoaders: returns the expected defaults", async () => {
  const loaders = await newDefaultFileValueLoaders();

  // Update these when we add more loaders to the defaults.
  assertEquals(loaders.size, 2);

  const txtLoader = loaders.get(".txt");
  assertEquals(txtLoader?.name, "Text file value loader");
  if (txtLoader) {
    const textValue = await txtLoader.loadValueFromFile(
      new URL("test_data/SimpleDirectory/text.txt", import.meta.url),
    );
    assertEquals(textValue, "This is a test\n");

    assertRejects(async () => {
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

    assertRejects(async () => {
      return await jsonLoader.loadValueFromFile(
        new URL("test_data/SimpleDirectory/json.json", import.meta.url),
        { signal: AbortSignal.abort("bar") },
      );
    });
  }
});
