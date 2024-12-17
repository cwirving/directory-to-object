/**
 * Parse a string as an integer. Only returns a number if it parses **completely** as a number -- i.e., ot only
 * does `Number.parseInt` parse the number, it is also the complete string.
 *
 * @param value The value to parse.
 * @returns The parsed integer or `NaN` if it is not an integer.
 */
export function parseInt(value: string): number {
  const maybeInt = Number.parseInt(value);
  if (maybeInt == maybeInt && String(maybeInt) === value) {
    return maybeInt;
  }

  return NaN;
}

/**
 * Compares two strings in a number-aware manner. If both strings can be parsed
 * as integers, the comparison is done numerically. If only one string can be
 * parsed as an integer, it is considered smaller. If neither string can be
 * parsed as an integer, a lexicographical comparison is performed.
 * Additionally, if a string is undefined, it is considered greater than any defined string (to sort last).
 *
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @return A negative number if `a` is less than `b`, zero if they are considered equal, or a positive number if `a` is greater than `b`.
 */
export function numberAwareComparison(
  a: string | undefined,
  b: string | undefined,
): number {
  // Deal with the `undefined` cases.
  if (a === undefined) {
    return (b === undefined) ? 0 : -1;
  } else if (b === undefined) {
    return 1;
  }

  // Deal with the numeric cases.
  const aNum = parseInt(a);
  const bNum = parseInt(b);
  if (aNum == aNum) {
    if (bNum === bNum) {
      return aNum - bNum;
    } else {
      return -1;
    }
  } else if (bNum === bNum) {
    return 1;
  }

  // The fallback: string comparison.
  return a.localeCompare(b);
}
