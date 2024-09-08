import { test } from "@cross/test";
import { assert, assertEquals, assertExists } from "@std/assert";
import { newDirectoryContentsReader, newFileTextLoader } from "./factories.ts";
import { DirectoryEntry } from "./interfaces.ts";

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
