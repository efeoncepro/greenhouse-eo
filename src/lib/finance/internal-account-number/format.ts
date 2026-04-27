/**
 * Format / parse / validate utilities for internal account numbers (TASK-700).
 *
 * Format v1: `TT-XX-D-NNNN`
 *   TT   = 2-digit numeric tenant code
 *   XX   = 2-digit numeric type code
 *   D    = Luhn mod-10 check digit
 *   NNNN = 4-digit zero-padded sequential per (tenant, type)
 *
 * The last 4 characters of the formatted string are ALWAYS the pure
 * sequential — that is the property the masking layer relies on.
 */

import { luhnCheckDigit, luhnIsValid } from './luhn'

const FORMAT_V1_REGEX = /^([0-9]{2})-([0-9]{2})-([0-9])-([0-9]{4})$/

export interface AccountNumberParts {
  tenantCode: string
  typeCode: string
  dv: string
  sequential: number
  formatVersion: number
}

/**
 * Compose a formatted account number from its parts. Computes the DV.
 * Used by tests and admin tooling — runtime allocation goes through SQL
 * `allocate_account_number()` to guarantee atomicity.
 */
export const formatAccountNumber = (parts: {
  tenantCode: string
  typeCode: string
  sequential: number
}): string => {
  const { tenantCode, typeCode, sequential } = parts

  if (!/^[0-9]{2}$/.test(tenantCode)) {
    throw new Error(`formatAccountNumber: tenantCode must be 2 digits, got "${tenantCode}"`)
  }

  if (!/^[0-9]{2}$/.test(typeCode)) {
    throw new Error(`formatAccountNumber: typeCode must be 2 digits, got "${typeCode}"`)
  }

  if (!Number.isInteger(sequential) || sequential < 1 || sequential > 9999) {
    throw new Error(`formatAccountNumber: sequential must be 1..9999, got ${sequential}`)
  }

  const sequentialPadded = String(sequential).padStart(4, '0')
  const payload = `${tenantCode}${typeCode}${sequentialPadded}`
  const dv = luhnCheckDigit(payload)

  return `${tenantCode}-${typeCode}-${dv}-${sequentialPadded}`
}

/**
 * Parse a formatted account number into its parts. Returns `null` for any
 * input that does not match the v1 shape — does NOT validate the DV (use
 * `validateAccountNumber` for that).
 */
export const parseAccountNumber = (number: string): AccountNumberParts | null => {
  const match = FORMAT_V1_REGEX.exec(number)

  if (!match) return null

  const [, tenantCode, typeCode, dv, sequentialPadded] = match

  return {
    tenantCode,
    typeCode,
    dv,
    sequential: Number(sequentialPadded),
    formatVersion: 1
  }
}

/**
 * Strict validation: structural shape AND Luhn DV correctness.
 */
export const validateAccountNumber = (number: string): boolean => {
  const parts = parseAccountNumber(number)

  if (!parts) return false

  const sequentialPadded = String(parts.sequential).padStart(4, '0')
  const payload = `${parts.tenantCode}${parts.typeCode}${sequentialPadded}`

  return luhnIsValid(payload, parts.dv)
}
