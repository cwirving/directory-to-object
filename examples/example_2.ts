import {
  defaultLoaders,
  Loaders,
} from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = Loaders.binaryFile();

// Add this new binary loader to the loaders known by the `loadObjectFromDirectory` function.
defaultLoaders.push(binaryLoader);
