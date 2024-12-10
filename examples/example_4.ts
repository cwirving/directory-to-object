import * as YAML from "@std/yaml";
import { toFileUrl } from "@std/path";
import { Loaders } from "@scroogieboy/directory-to-object";

const yamlLoader = Loaders.customFile({
  extension: ".yaml",
  name: "YAML file value loader",
  parser: YAML.parse,
  });

const binaryLoader = Loaders.binaryFile();

const loaders = [yamlLoader, binaryLoader];

// Create an object loader with exactly the loaders we created above.
const directoryLoader = Loaders.directoryAsObject({
  loaders: loaders,
});

const directoryUrl = new URL(
  toFileUrl(await Deno.realPath("./my-config-directory")),
);

// Use the `loadDirectory` convenience method to load the directory contents.
const configuration = directoryLoader.loadDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
