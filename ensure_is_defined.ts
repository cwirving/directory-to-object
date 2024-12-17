/**
 * Let's just make sure that a string is actually defined. Throw if not.
 *
 * @param value The candidate string or `undefined`.
 * @returns The string, if defined.
 */
export function ensureIsDefined(value: string | undefined): string {
  if (value === undefined) {
    throw new Error("Internal error: value is undefined");
  }

  return value;
}
