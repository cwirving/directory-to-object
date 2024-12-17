# Directory-To-Object: A configuration directory loader

## Introduction and rationale

This library is intended for complicated configuration cases where having just
one structured file is too limiting or is hard for humans to understand. Instead
of cramming all the configuration into one structured file, this library allows
the configuration structure to be split across multiple files in a directory and
combined on read into a single object.

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

- Value loaders (implementing the `ValueLoader` interface) which can load the
  contents of files or directories. These loaders are platform-agnostic and use
  the readers to perform actual I/O.
- Platform-specific directory contents readers (which list the contents of
  directories).
- Platform-specific file readers that perform the low-level file reading used by
  file value loaders.

The top-level `loadObjectFromDirectory` function is a convenience wrapper around
default implementations of these concepts.

### Changing the directory processing logic

A generic directory to object loader can be constructed using the `Loaders`
builder, which automatically determines the reader implementations to use for
the current platform. Consumers can also write their own loaders from scratch
and implement readers for new platforms.

### Changing how directories are read

The `newDirectoryContentsReader` function creates a directory contents reader
for the current runtime. The current runtimes supported include Deno, Node.js
and Bun and the directory contents reader for each platform only support file
system directories.

### Changing how files are read and adding new file formats

The `Loaders.textFile`, `Loaders.binaryFile` and `Loaders.jsonFile` methods
create text, binary and JSON file loaders, respectively.

The file value loaders in the library are constructed using the loader builder
exported as `Loaders`, including the `Loaders.customFile` loader that makes it
easy to create new loaders for textual formats (e.g., YAML). The library only
contains loaders for formats that are built-in to the JavaScript runtime, to
minimize external dependencies.

New file value loaders can be added to the loaders used by default by adding
them to the `defaultLoaders` array. For example:

```typescript
import { defaultLoaders, Loaders } from "@scroogieboy/directory-to-object";

// Create a binary file loader
const binaryLoader = Loaders.binaryFile();

// Add this new binary loader to the loaders known by the `loadObjectFromDirectory` function.
defaultLoaders.push(binaryLoader);
```

To add new file formats to parse, The loader builder includes the `customFile`
method, which produces a new file value loader given a caller-supplied parser
function (with a signature similar to `JSON.parse`).

For example, to add YAML support,

```typescript
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
```

### Writing your own loaders

Value loaders implement the {@linkcode ValueLoader} interface:

```typescript
interface ValueLoader<TValue> {
  readonly name: string;

  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean>;

  computeKey(entry: DirectoryEntryInContext): string | undefined;

  loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue>;
}
```

`canLoadValue` is called first with the information about the file/directory to
potentially load. This method returns a boolean value or promise that resolves
to a boolean value indicating whether this loader can load the entry.

`computeKey` is called if `canLoadValue` returned in the positive to determine
the key of the corresponding property. Most loaders simply strip the extension
from file names as their key "computation". However, the loader can also return
`undefined`, which indicates that the enclosing loader should skip this value.

`loadValue` is called to actually load the value from the file system.

Interface {@linkcode ValueLoader} is all that is necessary to implement in a
loader, then the `utility/makeFluent` function can be used to wrap it in a full
implementation of interface {@linkcode FluentLoader}.

### Taking control: using the `Loaders` builder

The `Loaders.directoryAsObject` function allows the caller to construct a
directory object loader with exactly file loaders they need. The
`Loaders.directoryAsObject` function also takes default option values that will
be merged with the values passed to the `loadValue` method at runtime, so that
common options can be set once rather than repeatedly passed in. The options
passed in to the `loadValue` method override the defaults on an option-by-option
basis -- for example, allowing the caller to set the merge functions as a
default, but specifying a signal every individual call.

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
```

**Example:** Create a directory loader that merges overlapping array and object
properties from different files:

```typescript
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
```
