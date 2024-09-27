import * as url from "node:url";
import { loadObjectFromDirectory } from "@scroogieboy/directory-to-object";

const directorUrl = url.pathToFileURL("./my-config-directory");
const configuration = await loadObjectFromDirectory(directorUrl);

// Do something with the configuration... E.g., print it.
console.log(configuration, null, 2);
