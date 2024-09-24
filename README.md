# Directory-To-Object: A configuration directory reader

## Introduction and rationale

This library is intended for complicated configuration cases where having just
one structured file is just too limiting or hard for humans to understand.
Isntead of cramming all the configuration into one structured file, this library
allows the configuration structure to be split across multiple files in a
directory and combined on read into a single object.

The library has been tested with Deno, Node.js and Bun for reading local files
and directories containing text and JSON files. The library can be configured to
read local binary files (but isn't configured to do so by default as that is an
unusual use case for configuration scenarios). It is extensible to other
runtimes and other file locations, but these extensions are currently not
provided as part of the base library.

For example, given a configuration like:

```json5
{
  "title": "some value",
  "inputOptions": {
    /* ... */
  },
  "outputOptions": {
    /* ... */
  }
}
```

This could be represented as a directory containing three files:

```
title.txt
inputOptions.json
outputOptions.json
```

Loading the directory using this library would result in the same configuration
structure, but the file system representation is less monolithic and can be
easier for collaboration between less technically-savvy people.

## Example

Loading a configuration directory is as simple as (Node.js example):

```typescript
import { loadObjectFromDirectory } from "@scroogieboy/directory-to-object";

const directorUrl = path.url.pathToFileURL("./my-config-directory");
const configuration = await loadObjectFromDirectory(directorUrl);

// Do something with the configuration... E.g., print it.
console.log(configuration, null, 2);
```

## Advanced usage

The main concepts in the library are:

- Directory to object loaders (which implement the `loadObjectFromDirectory`
  method)
- Directory contents readers (which list the contents of directories)
- File value loaders (which read the contents of files into JavaScript values)

The top-level `loadObjectFromDirectory` function is a convenience wrapper around
default implementations of these concepts.

### Changing the directory processing logic

A generic directory to object loader can be constructed using the
`newDirectoryObjectLoader` function, using provided file value loaders and a
directory contents reader. Consumers can also write their own.

### Changing how directories are read

The `newDirectoryContentsReader` function creates a directory contents reader
for the current runtime. The current runtimes supported include Deno, Node.js
and Bun and the directory contents reader for each platform only support file
system directories.

### Changing how files are read and adding new file formats

The `newTextFileValueLoader`, `newBinaryFileValueLoader` and
`newJsonFileValueLoader` factory functions create text file, JSON file and
binary file loaders, respectively.

The file value loaders in the library are constructed by passing them a file
reader implementation. This separates the concerns of loading the binary bits
from the parsing and processing of file formats.

New file value loaders can be added to the readers used by default by adding
them to the `fileValueLoaders` map. For example:

```typescript
import {
  fileValueLoaders,
  newBinaryFileValueLoader,
  newFileBinaryReader,
} from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = newBinaryFileValueLoader(newFileBinaryReader());

// Add this new binary loader to the loaders known by the `loadObjectFromDirectory` function.
fileValueLoaders.set(".bin", binaryLoader);
```

Another common case is to add new file formats to parse. The library includes a
convenient hepler function called `newStringParserFileValueLoader`, which
produces a new file value reader from a file contents reader and a parser (with
a signature similar to `JSON.parse`).

For example, to add YAML support,

```typescript
import * as YAML from "@std/yaml";
import {
  fileValueLoaders,
  newFileTextReader,
  newStringParserFileValueLoader,
} from "@scroogieboy/directory-to-object";

// Create a YAML file loader
const yamlLoader = newStringParserFileValueLoader(
  newFileTextReader(),
  YAML.parse,
);

// Add it for the ".yaml" extension
fileValueLoaders.set(".yaml", yamlLoader);
```

### Taking control: using `newDirectoryObjectLoader`

The `newDirectoryObjectLoader` function allows the caller to construct a
directory object loader with exactly the readers and loaders they need.

For example, to create a directory loader than only processes binary (".bin")
and YAML (".yaml") files:

```typescript
import * as YAML from "@std/yaml";
import { fromFileUrl } from "@std/path";
import {
  fileValueLoaders,
  newBinaryFileValueLoader,
  newFileBinaryReader,
  newFileTextReader,
  newStringParserFileValueLoader,
} from "@scroogieboy/directory-to-object";

const yamlLoader = newStringParserFileValueLoader(
  newFileTextReader(),
  YAML.parse,
);

const binaryLoader = newBinaryFileValueLoader(newFileBinaryReader());

const loaders = [
  [".yaml", yamlLoader],
  [".bin", binaryLoader],
];

// Create an object loader with exactly the loaders we created above.
const directoryLoader = newDirectoryObjectLoader(
  loaders,
  newDirectoryContentsReader(),
);

const directoryUrl = new URL(
  fromFileUrl(await Deno.realPath("./my-config-directory")),
);
const configuration = directoryLoader.loadObjectFromDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
```
