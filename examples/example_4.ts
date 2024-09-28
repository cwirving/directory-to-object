import * as YAML from "@std/yaml";
import { toFileUrl } from "@std/path";
import {
  type FileValueLoader,
  newBinaryFileValueLoader,
  newDirectoryContentsReader,
  newDirectoryObjectLoader,
  newFileBinaryReader,
  newFileTextReader,
  newStringParserFileValueLoader,
} from "@scroogieboy/directory-to-object";

const yamlLoader = newStringParserFileValueLoader(
  newFileTextReader(),
  YAML.parse,
  "YAML file value loader",
);

const binaryLoader = newBinaryFileValueLoader(newFileBinaryReader());

const loaders: [string, FileValueLoader][] = [
  [".yaml", yamlLoader],
  [".bin", binaryLoader],
];

// Create an object loader with exactly the loaders we created above.
const directoryLoader = newDirectoryObjectLoader(
  loaders,
  newDirectoryContentsReader(),
);

const directoryUrl = new URL(
  toFileUrl(await Deno.realPath("./my-config-directory")),
);
const configuration = directoryLoader.loadObjectFromDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
