/**
 * Luhn mod-10 check digit — canonical TS mirror of the SQL function
 * `greenhouse_finance.luhn_check_digit(payload TEXT)` (TASK-700).
 *
 * Both implementations MUST produce identical output for every payload.
 * The pair is regression-tested in `__tests__/luhn-parity.test.ts`.
 *
 * Algorithm:
 *   - Walk the payload left-to-right.
 *   - For each digit, compute its position from the right (1-indexed).
 *     Rightmost digit of payload sits at position 2 in the final
 *     (payload+DV) number, so it gets doubled. Then alternate.
 *   - If a doubled digit > 9, subtract 9.
 *   - Sum all (potentially doubled) digits.
 *   - Check digit = (10 - (sum mod 10)) mod 10. Always 0-9.
 *
 * @param payload  All-digit string (e.g. '01900001').
 * @returns Single digit '0'-'9'.
 * @throws  Error if payload contains non-digit characters or is empty.
 */
export const luhnCheckDigit = (payload: string): string => {
  if (!/^[0-9]+$/.test(payload)) {
    throw new Error(
      `luhnCheckDigit: payload must be all digits, got "${payload}"`
    )
  }

  let total = 0

  for (let i = 0; i < payload.length; i += 1) {
    const positionFromRight = payload.length - i
    const digit = Number(payload[i])

    if (positionFromRight % 2 === 1) {
      const doubled = digit * 2

      total += doubled > 9 ? doubled - 9 : doubled
    } else {
      total += digit
    }
  }

  return String((10 - (total % 10)) % 10)
}

/**
 * Validate that a candidate string carries a correct Luhn check digit.
 * Used by `validateAccountNumber` after structural parsing succeeds.
 */
export const luhnIsValid = (payload: string, checkDigit: string): boolean => {
  if (!/^[0-9]$/.test(checkDigit)) return false

  try {
    return luhnCheckDigit(payload) === checkDigit
  } catch {
    return false
  }
}
