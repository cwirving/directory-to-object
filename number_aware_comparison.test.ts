import { assert, assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { numberAwareComparison } from "./number_aware_comparison.ts";

test("should return a negative number when a < b numerically", () => {
  assert(numberAwareComparison("2", "10") < 0);
});

test("should return a positive number when a > b numerically", () => {
  assert(numberAwareComparison("20", "10") > 0);
});

test("should return 0 when a and b are numerically equal", () => {
  assertEquals(numberAwareComparison("5", "5"), 0);
});

test("should consider strings not parseable as numbers as smaller than parseable strings", () => {
  assert(numberAwareComparison("abc", "10") > 0);
  assert(numberAwareComparison(" 09", "10") > 0);
  assert(numberAwareComparison("09 ", "10") > 0);
  assert(numberAwareComparison("10", "abc") < 0);
  assert(numberAwareComparison("10", "09 ") < 0);
  assert(numberAwareComparison("10", " 09") < 0);
});

test("should use lexicographical comparison when neither string is numeric", () => {
  assert(numberAwareComparison("abc", "def") < 0);
  assert(numberAwareComparison("def", "abc") > 0);
  assertEquals(numberAwareComparison("abc", "abc"), 0);
});

test("should handle undefined as greater than any defined string", () => {
  assert(numberAwareComparison(undefined, "abc") < 0);
  assert(numberAwareComparison("abc", undefined) > 0);
  assertEquals(numberAwareComparison(undefined, undefined), 0);
});
