import { test } from "@cross/test";
import { assertEquals } from "@std/assert";
import { loadObjectFromDirectory } from "./mod.ts";

test("loadObjectFromDirectory reads SimpleDirectory", async () => {
  const directoryUrl = new URL("test_data/SimpleDirectory", import.meta.url);
  const contents = await loadObjectFromDirectory(directoryUrl);

  assertEquals(contents, {
    json: {
      foo: "bar",
    },
    text: "This is a test\n",
  });
});
