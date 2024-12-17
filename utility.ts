/**
 * Utility functions useful in advanced library usage scenarios.
 *
 * The {@linkcode makeFluent} function is a convenient way to "upgrade" a simple {@linkcode ValueLoader}
 * implementation to the full {@linkcode FluentLoader} interface by wrapping it in a fluent implementation. This is
 * useful when implementing a value loader from scratch -- one can simply implement the core interface and use
 * the library implementation of fluent handlers via a call to {@linkcode makeFluent}.
 *
 * @module
 */

import type { FluentLoader, ValueLoader } from "./interfaces.ts";

export { makeFluent } from "./fluent_loader.ts";