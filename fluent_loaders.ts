import type {
  DirectoryEntryInContext,
  FluentLoader,
  ValueLoader,
  ValueLoaderOptions,
} from "./interfaces.ts";

export class FluentLoaderImpl<TValue> implements FluentLoader<TValue> {
  readonly #innerLoader: ValueLoader<TValue>;
  readonly #name: string;

  protected constructor(innerLoader: ValueLoader<TValue>, name: string | undefined) {
    this.#innerLoader = innerLoader;
    this.#name = name ?? innerLoader.name;
  }

  static newLoader<TValue>(
    innerLoader: ValueLoader<TValue>,
    name: string | undefined,
  ): FluentLoader<TValue> {
    return Object.freeze(new FluentLoaderImpl(innerLoader, name));
  }

  get name(): string {
    return this.#name;
  }

  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean> {
    return this.#innerLoader.canLoadValue(entry);
  }

  computeKey(entry: DirectoryEntryInContext): string | undefined {
    return this.#innerLoader.computeKey(entry);
  }

  loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue> {
    return this.#innerLoader.loadValue(entry, options);
  }
}

export function makeFluent<TValue>(loader: ValueLoader<TValue>): FluentLoader<TValue> {
  return (loader instanceof FluentLoaderImpl)
    ? loader
    : FluentLoaderImpl.newLoader(loader, undefined);
}
