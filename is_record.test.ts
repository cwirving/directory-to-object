import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import { isRecord } from "./is_record.ts";

test("isRecord", () => {
  assertEquals(isRecord(undefined), false);
  assertEquals(isRecord(null), false);
  assertEquals(isRecord(123), false);
  assertEquals(isRecord("abc"), false);
  assertEquals(isRecord(["abc", "def"]), false);
  assertEquals(isRecord({}), true);
  assertEquals(isRecord({ abc: "def" }), true);
  assertEquals(isRecord(new URL("http://xyz.zyx")), false);

  class Something {
    a = 123;
    b = 456;
  }
  assertEquals(isRecord(new Something()), false);
});
