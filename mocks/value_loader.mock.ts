import type {
  DirectoryEntryInContext,
  ValueLoader,
  ValueLoaderOptions,
} from "../interfaces.ts";
import type { CanLoadValueFunc } from "../interfaces.ts";

export interface ValueLoaderCall<TResult> {
  entry: DirectoryEntryInContext;
  options?: Readonly<ValueLoaderOptions>;
  result: TResult;
}

export interface MockValueLoaderOptions {
  canLoadValue?: CanLoadValueFunc;
  computeKey?: (entry: DirectoryEntryInContext) => string | undefined;
  contents?: Record<string, unknown>;
}

export class MockValueLoader<TValue> implements ValueLoader<TValue> {
  name: string;
  contents: Record<string, unknown>;
  canLoadValueFn: CanLoadValueFunc | undefined;
  computeKeyFn:
    | ((entry: DirectoryEntryInContext) => string | undefined)
    | undefined;

  calls: {
    canLoadValue: ValueLoaderCall<boolean | Promise<boolean>>[];
    computeKey: ValueLoaderCall<string | undefined>[];
    loadValue: ValueLoaderCall<Promise<unknown>>[];
  } = { canLoadValue: [], computeKey: [], loadValue: [] };

  #defaultCanLoadValue(
    entry: DirectoryEntryInContext,
  ): boolean | Promise<boolean> {
    return this.contents[entry.url.href] !== undefined;
  }

  reset(): void {
    this.calls.canLoadValue.length = 0;
    this.calls.computeKey.length = 0;
    this.calls.loadValue.length = 0;
  }

  constructor(name: string, options?: Readonly<MockValueLoaderOptions>) {
    this.name = name;
    this.canLoadValueFn = options?.canLoadValue;
    this.computeKeyFn = options?.computeKey;
    this.contents = options?.contents ?? {};
  }

  canLoadValue(entry: DirectoryEntryInContext): boolean | Promise<boolean> {
    const result = this.canLoadValueFn
      ? this.canLoadValueFn(entry)
      : this.#defaultCanLoadValue(entry);
    this.calls.canLoadValue.push({ entry, result });
    return result;
  }

  computeKey(entry: DirectoryEntryInContext): string | undefined {
    const result = this.computeKeyFn ? this.computeKeyFn(entry) : entry.name;
    this.calls.computeKey.push({ entry, result });
    return result;
  }

  loadValue(
    entry: DirectoryEntryInContext,
    options?: Readonly<ValueLoaderOptions>,
  ): Promise<TValue> {
    const value = this.contents[entry.url.href];
    if (value === undefined) {
      return Promise.reject(new Error(`No value for ${entry.url.href}`));
    }

    const result = Promise.resolve(value as TValue);
    this.calls.loadValue.push({ entry, options, result });
    return result;
  }
}
