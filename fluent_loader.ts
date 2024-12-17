import picomatch from "picomatch";
import type {
  CanLoadValueFunc,
  DirectoryEntryInContext,
  FluentLoader,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";
import { ensureIsDefined } from "./ensure_is_defined.ts";

/**
 * Overrides applied by the `FluentLoaderImpl` on top of the inner loader.
 */
interface FluentOverrides {
  /**
   * This is the new name of the loader.
   */
  name?: string;

  /**
   * This predicate is **combined with** the inner loader's `canLoadValue` method via a logical AND.
   */
  canLoadValue?: CanLoadValueFunc;

  /**
   * This is the new method to compute the key, taking the key computed by the inner loader and transforming it into
   * the actual key. If the inner loader rejects the item (by returning `undefined`), then this will not
   * be called and the combined loader will reject the item.
   *
   * @param name The current name/key from the inner loader.
   * @returns The key computed by this loader.
   */
  computeKey?: (name: string) => string | undefined;
}

/**
 * Asynchronously perform the logical AND between two boolean values or promises to boolean values.
 *
 * @param a The first value to combine.
 * @param b The second value to combine.
 * @returns A promise that resolves to the logical AND of the two boolean values.
 */
export async function asyncAnd(
  a: boolean | Promise<boolean>,
  b: boolean | Promise<boolean>,
): Promise<boolean> {
  return (await a) && (await b);
}

/**
 * Concrete implementation of the {@linkcode FluentLoader} interface. It layers on all the fluent behaviors on top of
 * an existing object implementing interface {@linkcode ValueLoader}.
 */
export class FluentLoaderImpl<TValue> implements FluentLoader<TValue> {
  readonly #innerLoader: ValueLoader<TValue>;
  readonly #overrides: FluentOverrides;

  protected constructor(
    innerLoader: ValueLoader<TValue>,
    overrides: FluentOverrides,
  ) {
    this.#innerLoader = innerLoader;
    this.#overrides = overrides;
  }

  /**
   * Create a new _immutable_ implementation of the {@linkcode FluentLoader} interface, given an inner
   * {@linkcode ValueLoader} implementation and optional overrides to modify its behavior.
   *
   * @param innerLoader The inner loader to wrap.
   * @param overrides The behavior-altering overrides to apply to the inner loader.
   * @returns A frozen {@linkcode FluentLoader} implementation applying the overrides to the inner loader.
   */
  static newLoader<TValue>(
    innerLoader: ValueLoader<TValue>,
    overrides: FluentOverrides = {},
  ): FluentLoader<TValue> {
    return Object.freeze(new FluentLoaderImpl(innerLoader, overrides));
  }

  get name(): string {
    return this.#overrides.name ?? this.#innerLoader.name;
  }

  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean> {
    // Optimize for the case where we have no override.
    const innerAnswer = this.#innerLoader.canLoadValue(entry);
    if (this.#overrides.canLoadValue === undefined) {
      return innerAnswer;
    }

    // Let's do our best not to await non-promise values.
    const outerAnswer = this.#overrides.canLoadValue(entry);

    return (typeof innerAnswer === "boolean" &&
        typeof outerAnswer === "boolean")
      ? innerAnswer && outerAnswer
      : asyncAnd(innerAnswer, outerAnswer);
  }

  computeKey(entry: DirectoryEntryInContext): string | undefined {
    const innerComputed = this.#innerLoader.computeKey(entry);
    return (this.#overrides.computeKey !== undefined) &&
        (innerComputed !== undefined)
      ? this.#overrides.computeKey(innerComputed)
      : innerComputed;
  }

  loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue> {
    return this.#innerLoader.loadValue(entry, options);
  }

  withName(name: string): FluentLoader<TValue> {
    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      name: name,
    });
  }

  when(canLoadValue: CanLoadValueFunc): FluentLoader<TValue> {
    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: canLoadValue,
    });
  }

  whenExtensionIs(extension: string): FluentLoader<TValue> {
    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: (entry) => entry.name.endsWith(extension),
      computeKey: (name: string) =>
        name.substring(0, name.length - extension.length),
    });
  }

  whenExtensionIsOneOf(extensions: string[]): FluentLoader<TValue> {
    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: (entry) =>
        extensions.some((extension) => entry.name.endsWith(extension)),
      computeKey: (name: string) => {
        const extension = ensureIsDefined(
          extensions.find((e) => name.endsWith(e)),
        );
        return name.substring(0, name.length - extension.length);
      },
    });
  }

  whenPathMatches(pattern: string): FluentLoader<TValue> {
    const matcher = picomatch(pattern);

    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: (entry) => !!matcher(entry.relativePath),
    });
  }

  whenPathMatchesEvery(patterns: string[]): FluentLoader<TValue> {
    const matchers = patterns.map((p) => picomatch(p));

    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: (entry) => matchers.every((m) => m(entry.relativePath)),
    });
  }

  whenPathMatchesSome(patterns: string[]): FluentLoader<TValue> {
    const matchers = patterns.map((p) => picomatch(p));

    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      canLoadValue: (entry) => matchers.some((m) => m(entry.relativePath)),
    });
  }

  withKeyComputation(
    computation: (name: string) => string,
  ): FluentLoader<TValue> {
    return FluentLoaderImpl.newLoader<TValue>(this.#innerLoader, {
      computeKey: computation,
    });
  }

  async loadDirectory(
    directoryUrl: URL,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue> {
    const entry: DirectoryEntryInContext = {
      name: "",
      relativePath: "",
      type: "directory",
      url: directoryUrl,
    };

    if (!await this.#innerLoader.canLoadValue(entry)) {
      throw new Error(
        `Loader "${this.name}" cannot load directory "${directoryUrl.href}"`,
      );
    }

    return this.#innerLoader.loadValue(entry, options);
  }

  async loadFile(
    fileUrl: URL,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue> {
    const entry: DirectoryEntryInContext = {
      name: "",
      relativePath: "",
      type: "file",
      url: fileUrl,
    };

    if (!await this.#innerLoader.canLoadValue(entry)) {
      throw new Error(
        `Loader "${this.name}" cannot load file "${fileUrl.href}"`,
      );
    }

    return this.#innerLoader.loadValue(entry, options);
  }
}

/**
 * Transforms a given {@linkcode ValueLoader} into a {@linkcode FluentLoader}. If the input is already
 * the result of `makeFluent`, it returns the input without transformation.
 * Otherwise, creates and returns a new {@linkcode FluentLoader} implementation using the given loader.
 *
 * @param loader - The @linkcode ValueLoader} instance that provides values to be transformed into a {@linkcode FluentLoader}.
 * @return A {@linkcode FluentLoader} instance representing the transformed loader.
 */
export function makeFluent<TValue>(
  loader: ValueLoader<TValue>,
): FluentLoader<TValue> {
  return (loader instanceof FluentLoaderImpl)
    ? loader
    : FluentLoaderImpl.newLoader(loader);
}
