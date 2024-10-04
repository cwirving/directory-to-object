import { test } from "@cross/test";
import { assertEquals } from "@std/assert";
import { setOrMergeValue } from "./merge_utilities.ts";
import type { DirectoryObjectLoaderOptions } from "./interfaces.ts";
import { merge, union } from "@es-toolkit/es-toolkit";

test("setOrMergeValue plain overwrite cases", () => {
  let target: Record<string, unknown> = {};

  // New values
  setOrMergeValue(target, "a", 1);
  assertEquals(target, { a: 1 });
  setOrMergeValue(target, "b", "abc");
  assertEquals(target, { a: 1, b: "abc" });
  setOrMergeValue(target, "c", { x: "yz" });
  assertEquals(target, { a: 1, b: "abc", c: { x: "yz" } });

  // Overwrites
  setOrMergeValue(target, "a", 2);
  assertEquals(target, { a: 2, b: "abc", c: { x: "yz" } });
  setOrMergeValue(target, "a", "foo");
  assertEquals(target, { a: "foo", b: "abc", c: { x: "yz" } });
  setOrMergeValue(target, "a", { foo: "bar" });
  assertEquals(target, { a: { foo: "bar" }, b: "abc", c: { x: "yz" } });

  // Using example cases from the es-toolkit documentation, but with the
  // default overwrite behavior.
  target = { data: { a: 1, b: { x: 1, y: 2 } } };
  let source: Record<string, unknown> = { b: { y: 3, z: 4 }, c: 5 };
  setOrMergeValue(target, "data", source);
  assertEquals(target, { data: { b: { y: 3, z: 4 }, c: 5 } });

  target = { data: { a: [1, 2], b: { x: 1 } } };
  source = { a: [3], b: { y: 2 } };
  setOrMergeValue(target, "data", source);
  assertEquals(target, { data: { a: [3], b: { y: 2 } } });
});

test("setOrMergeValue merge cases from es-toolkit documentation", () => {
  let target: Record<string, unknown> = { data: { a: 1, b: { x: 1, y: 2 } } };
  let source: Record<string, unknown> = { b: { y: 3, z: 4 }, c: 5 };
  // Using the es-toolkit merge function, so that the results match.
  const options: DirectoryObjectLoaderOptions = {
    objectMergeFunction: merge,
  };
  setOrMergeValue(target, "data", source, options);
  assertEquals(target, { data: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 } });

  target = { data: { a: [1, 2], b: { x: 1 } } };
  source = { a: [3], b: { y: 2 } };
  setOrMergeValue(target, "data", source, options);
  assertEquals(target, { data: { a: [3, 2], b: { x: 1, y: 2 } } });

  target = { data: { a: null } };
  source = { a: [1, 2, 3] };
  setOrMergeValue(target, "data", source, options);
  assertEquals(target, { data: { a: [1, 2, 3] } });
});

test("setOrMergeValue merges/overwrites arrays", () => {
  let target: Record<string, unknown> = { data: [1, 2, 3] };
  let source: unknown[] = [4, 5, 6];

  // Using the default array merge function
  setOrMergeValue(target, "data", source);
  assertEquals(target, { data: [4, 5, 6] });

  // Using the es-toolkit merge function
  target = { data: [1, 2, 3] };
  source = [4, 5, 6];
  const options: DirectoryObjectLoaderOptions = {
    arrayMergeFunction: union,
  };
  setOrMergeValue(target, "data", source, options);
  assertEquals(target, { data: [1, 2, 3, 4, 5, 6] });
});
