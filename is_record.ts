/**
 * Check that a value is a plain JavaScript object (i.e., not a class instance).
 *
 * @param candidate The value to introspect.
 * @returns `true` if the candidate is a plain JavaScript object. I.e., that can be described by the type `Record<string, unknown>`.
 */
export function isRecord(
  candidate: unknown,
): candidate is Record<string, unknown> {
  if (
    typeof candidate === "object" && candidate !== null &&
    !Array.isArray(candidate)
  ) {
    const proto = Object.getPrototypeOf(candidate);
    return proto === null || proto === Object.prototype;
  }

  return false;
}
