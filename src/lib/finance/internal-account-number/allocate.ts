import 'server-only'

import { sql, type Kysely, type Transaction } from 'kysely'

import { getDb } from '@/lib/db'

import type { DB } from '@/types/db'

/**
 * Internal Account Number allocator (TASK-700) — TS entry point.
 *
 * Delegates the actual allocation to the canonical SQL function
 * `greenhouse_finance.allocate_account_number(...)`. The SQL function holds
 * the per-(space,type) advisory lock and the registry insert, so this TS
 * layer is a thin call boundary — there is NO business logic duplication.
 *
 * ⚠️ DO NOT inline the formatting / Luhn / sequential resolution here.
 * Use the SQL function. If you need a new format, bump
 * `format_version` in BOTH the SQL function and `format.ts`.
 *
 * Used today by:
 *   - `createShareholderAccount` in `src/lib/finance/shareholder-account/store.ts`
 *
 * Will be used by future modules:
 *   - employee/freelancer/client wallets
 *   - intercompany loans
 *   - factoring accounts
 *
 * Each consumer passes its own `typeCode` (registered in
 * `greenhouse_finance.internal_account_type_catalog`) and target table/id.
 */

export interface AllocateAccountNumberInput {
  /** Tenant scope (`greenhouse_core.spaces.space_id`). Required. */
  spaceId: string
  /** 2-digit type code from `internal_account_type_catalog`. */
  typeCode: string
  /** Owning table receiving the number (e.g. 'accounts', 'wallets'). */
  targetTable: string
  /** Primary key of the row receiving the number. */
  targetId: string
  /** Optional Kysely transaction — pass through to keep allocation atomic with the row insert. */
  client?: Kysely<DB> | Transaction<DB>
}

export interface AllocateAccountNumberResult {
  accountNumber: string
  formatVersion: number
  sequentialValue: number
}

interface AllocateRow {
  account_number: string
  format_version: number
  sequential_value: number
}

export const allocateAccountNumber = async (
  input: AllocateAccountNumberInput
): Promise<AllocateAccountNumberResult> => {
  const { spaceId, typeCode, targetTable, targetId } = input

  if (!spaceId) {
    throw new Error('allocateAccountNumber: spaceId is required')
  }

  if (!/^[0-9]{2}$/.test(typeCode)) {
    throw new Error(`allocateAccountNumber: typeCode must be 2 digits, got "${typeCode}"`)
  }

  if (!targetTable || !targetId) {
    throw new Error('allocateAccountNumber: targetTable and targetId are required')
  }

  const db = input.client ?? (await getDb())

  const result = await sql<AllocateRow>`
    SELECT account_number, format_version, sequential_value
      FROM greenhouse_finance.allocate_account_number(
        ${spaceId},
        ${typeCode}::char(2),
        ${targetTable},
        ${targetId}
      )
  `.execute(db)

  const row = result.rows[0]

  if (!row || !row.account_number) {
    throw new Error(
      `allocateAccountNumber: SQL function returned no row for space=${spaceId} type=${typeCode}`
    )
  }

  return {
    accountNumber: row.account_number,
    formatVersion: row.format_version,
    sequentialValue: row.sequential_value
  }
}

/** Canonical type code registry — keep in sync with `internal_account_type_catalog`. */
export const InternalAccountTypeCode = {
  shareholderAccount: '90'
  // Future: employeeWallet '10', freelancerWallet '11', clientWallet '20',
  //         supplierWallet '30', intercompanyLoan '70', factoringAccount '80', ...
} as const

export type InternalAccountTypeCodeValue =
  (typeof InternalAccountTypeCode)[keyof typeof InternalAccountTypeCode]
