import {
  fileValueLoaders,
  newBinaryFileValueLoader,
  newFileBinaryReader,
} from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = newBinaryFileValueLoader(newFileBinaryReader());

// Add this new binary loader to the loaders known by the `loadObjectFromDirectory` function.
fileValueLoaders.set(".bin", binaryLoader);
