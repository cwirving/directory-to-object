import * as YAML from "@std/yaml";
import {
  fileValueLoaders,
  newFileReader,
  newStringParserFileValueLoader,
} from "@scroogieboy/directory-to-object";

// Create a YAML file loader
const yamlLoader = newStringParserFileValueLoader(
  newFileReader(),
  YAML.parse,
  "YAML file value loader",
);

// Add it for the ".yaml" extension
fileValueLoaders.set(".yaml", yamlLoader);
