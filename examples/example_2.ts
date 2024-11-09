import {
  fileValueLoaders,
  newBinaryFileValueLoader,
  newFileReader,
} from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = newBinaryFileValueLoader(newFileReader());

// Add this new binary loader to the loaders known by the `loadObjectFromDirectory` function.
fileValueLoaders.set(".bin", binaryLoader);
