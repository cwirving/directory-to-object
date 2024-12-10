import type { ValueLoaderOptions } from "./interfaces.ts";

import { isRecord } from "./is_record.ts";

/**
 * A helper function to merge default and explicit options.
 *
 * Note: This is for internal use only. Not part of the public library API.
 *
 * @param defaultOptions The default options, if any.
 * @param options The explicit options, if any.
 * @returns The union of default and explicit options (with the explicit options overriding defaults) or `undefined` if both were themselves `undefined`.
 */
export function mergeOptions<T extends object>(
  defaultOptions: Readonly<T> | undefined,
  options: Readonly<T> | undefined,
): Readonly<T> | undefined {
  if (!defaultOptions) {
    return options;
  }

  if (!options) {
    return defaultOptions;
  }

  const mergedOptions: T = {} as T;
  Object.assign(mergedOptions, defaultOptions);
  Object.assign(mergedOptions, options);
  return mergedOptions;
}

/**
 * Default behavior for array and object merges -- overwrites with the new value.
 * @param _existingValue The existing value in the data structure.
 * @param newValue The new value loaded.
 * @returns The new value to assign to the result.
 */
function _overwrite<T>(_existingValue: T, newValue: T): T {
  return newValue;
}

/**
 * Set a property value on the target object, unless:
 * - there is already a property on the target
 * - the value of the existing property is an array or plain JavaScript object
 * - the new value is also an array / plain JavaScript object
 *
 * ... in which case the existing property value and new value will be merged
 * in place using the array and object merge functions provided in the options.
 *
 * If the merge functions are not specified, the default behavior is to overwrite
 * the target value.
 *
 * Note: This is for internal use only. Not part of the public library API.
 *
 * @param target The target plain JavaScript object where the property will be set.
 * @param key The key of the property to set.
 * @param value The new value to set (or merge).
 * @param options Options specifying the merge functions to use.
 */
export function setOrMergeValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  options?: ValueLoaderOptions,
): void {
  if (typeof value === "object") {
    const targetValue = target[key];

    if (Array.isArray(value) && Array.isArray(targetValue)) {
      const merge = options?.arrayMergeFunction ?? _overwrite<unknown[]>;
      target[key] = merge(targetValue, value);
      return;
    }

    if (isRecord(value) && isRecord(targetValue)) {
      const merge = options?.objectMergeFunction ??
        _overwrite<Record<string, unknown>>;
      target[key] = merge(targetValue, value);
      return;
    }
  }

  target[key] = value;
}
