import * as YAML from "@std/yaml";
import { defaultLoaders, Loaders } from "@scroogieboy/directory-to-object";

// Create a YAML file loader
const yamlLoader = Loaders.customFile({
  extension: ".yaml",
  name: "YAML file value loader",
  parser: YAML.parse,
});

// Add it to the default loaders
defaultLoaders.push(yamlLoader);
