import { assertEquals, assertThrows } from "@std/assert";
import { test } from "@cross/test";
import { ensureIsDefined } from "./ensure_is_defined.ts";

test("ensureIsDefined should return the string if it is defined", () => {
  const value = "hello";
  const result = ensureIsDefined(value);
  assertEquals(result, value);
});

test("ensureIsDefined should throw an error when the value is undefined", () => {
  assertThrows(
    () => ensureIsDefined(undefined),
    Error,
    "Internal error: value is undefined",
  );
});
