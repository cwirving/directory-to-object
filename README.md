# Directory-To-Object: A configuration directory loader

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

## CLI

See the
[`@scroogieboy/directory-to-object-cli`](https://jsr.io/@scroogieboy/directory-to-object-cli)
package for a simple CLI tool that exercises the capabilities of this library.

## Example

Loading a configuration directory is as simple as (Node.js example):

```typescript
import { loadObjectFromDirectory } from "@scroogieboy/directory-to-object";

const directorUrl = url.pathToFileURL("./my-config-directory");
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
- File readers that perform the low-level file reading used by file value
  loaders

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
`newJsonFileValueLoader` factory functions create text, binary and JSON file
loaders, respectively.

The file value loaders in the library are constructed by passing them a file
reader implementation. This separates the concerns of loading the binary bits
from the parsing and processing of file formats.

New file value loaders can be added to the readers used by default by adding
them to the `fileValueLoaders` map. For example:

```typescript
import {
  fileValueLoaders,
  newBinaryFileValueLoader,
  newFileReader,
} from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = newBinaryFileValueLoader(newFileReader());

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
```

### Taking control: using `newDirectoryObjectLoader`

The `newDirectoryObjectLoader` function allows the caller to construct a
directory object loader with exactly the readers and loaders they need. The
`newDirectoryObjectLoader` function also takes default option values that will
be merged with the values passed to the `loadObjectFromDirectory` method at
runtime, so that common options can be set once rather than repeatedly passed
in. The options passed in to the `loadObjectFromDirectory` method override the
defaults on an option-by-option basis -- for example, allowing the caller to set
the merge functions as a default, but specifying a signal every individual call.

The use of merge functions is especially valuable when supporting multiple file
formats that parse to objects. For example, if both YAML and JSON files are
enabled, a directory containing both "foo.json" and "foo.yaml" has two sources
for the "foo" property. By default, one or the other will be chosen, but this
behavior can be overridden by providing an object merge function in the options.
Whenever the loader tries to assign an array or object to a property, it will
defer to the corresponding merge function to handle merging duties. Callers can
decide on the level of merging sophistication they need and provide the
implementation (e.g., using [lodash](https://lodash.com),
[es-toolkit](https://es-toolkit.slash.page),
[@cross/deepmerge](https://jsr.io/@cross/deepmerge) or other merging functions).

**Example:** Create a directory loader than only processes binary (".bin") and
YAML (".yaml") files:

```typescript
import * as YAML from "@std/yaml";
import { toFileUrl } from "@std/path";
import {
  type FileValueLoader,
  newBinaryFileValueLoader,
  newDirectoryContentsReader,
  newDirectoryObjectLoader,
  newFileReader,
  newStringParserFileValueLoader,
} from "@scroogieboy/directory-to-object";

const reader = newFileReader();

const yamlLoader = newStringParserFileValueLoader(
  reader,
  YAML.parse,
  "YAML file value loader",
);

const binaryLoader = newBinaryFileValueLoader(reader);

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
```

**Example:** Create a directory loader that merges overlapping array and object
properties from different files:

```typescript
import { toFileUrl } from "@std/path";
import { merge, union } from "@es-toolkit/es-toolkit";
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
  },
);

const directoryUrl = new URL(
  toFileUrl(await Deno.realPath("./my-config-directory")),
);
const configuration = directoryLoader.loadObjectFromDirectory(directoryUrl);

// Pretty-print the configuration
console.log(configuration, null, 2);
```
