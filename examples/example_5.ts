import { toFileUrl } from "@std/path";
import { merge, union } from "@es-toolkit/es-toolkit";
import { defaultLoaders, Loaders } from "@scroogieboy/directory-to-object";

// Create a directory to object loader that loads the default file extensions and merges
// any arrays and objects that overlap between loaded files using
// [es-toolkit](https://es-toolkit.slash.page) functions.
const directoryLoader = Loaders.directoryAsObject({
  loaders: defaultLoaders,
  name: "My directory loader",
  defaultOptions: {
    arrayMergeFunction: union,
    objectMergeFunction: merge,
  },
});

const directoryUrl = new URL(
  toFileUrl(await Deno.realPath("./my-config-directory")),
);

const configuration = directoryLoader.loadDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
