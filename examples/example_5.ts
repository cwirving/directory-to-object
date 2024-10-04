import { toFileUrl } from "@std/path";
import { union, merge } from "@es-toolkit/es-toolkit";
import {
fileValueLoaders,
newDirectoryContentsReader,
newDirectoryObjectLoader,
} from "@scroogieboy/directory-to-object";

// Create an object loader that loads the default file extensions and merges
// any arrays and objects that overlap between loaded files using
// [es-toolkit](https://es-toolkit.slash.page) functions.
const directoryLoader = newDirectoryObjectLoader(
  fileValueLoaders,
  newDirectoryContentsReader(),
  "My directory loader",
  {
    arrayMergeFunction: union,
    objectMergeFunction: merge,
  }
);

const directoryUrl = new URL(
  toFileUrl(await Deno.realPath("./my-config-directory")),
);
const configuration = directoryLoader.loadObjectFromDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
