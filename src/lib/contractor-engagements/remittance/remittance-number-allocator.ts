import 'server-only'

/**
 * TASK-960 Slice 1 — Contractor Remittance Advice number allocator (TS wrapper).
 *
 * Thin wrapper over the canonical SQL function
 * `greenhouse_hr.allocate_remittance_advice_number(issuer, payable)` — the single
 * source of truth for the gapless, atomic, idempotent `EO-RA-NNNNNN` correlative.
 *
 * NEVER compose the number in TS. The advisory lock + MAX()+1 + idempotency check
 * all live in the SQL function (mirror of TASK-700). A re-allocation of the same
 * payable returns its ORIGINAL number — re-emitting a document never re-numbers it.
 */

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'

export interface RemittanceAdviceNumber {
  remittanceNumber: string
  sequentialValue: number
  formatVersion: number
}

export interface AllocateRemittanceAdviceNumberInput {
  /** Operating Entity that pays (series scope). NEVER hardcoded. */
  issuerOrganizationId: string
  contractorPayableId: string
  /** Optional transaction client so allocation can share a tx with another write. */
  client?: PoolClient
}

type AllocatorRow = {
  remittance_number: string
  sequential_value: number | string
  format_version: number | string
}

const runRows = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)

    return result.rows
  }

  return query<T>(sql, params)
}

const mapRow = (row: AllocatorRow): RemittanceAdviceNumber => ({
  remittanceNumber: row.remittance_number,
  sequentialValue: Number(row.sequential_value),
  formatVersion: Number(row.format_version)
})

/**
 * Allocate (or re-resolve, idempotent) the EO-RA-NNNNNN number for a payable.
 * Pass the Operating Entity org id as the series scope. Safe to call repeatedly.
 */
export const allocateRemittanceAdviceNumber = async (
  input: AllocateRemittanceAdviceNumberInput
): Promise<RemittanceAdviceNumber> => {
  const rows = await runRows<AllocatorRow>(
    `SELECT remittance_number, sequential_value, format_version
     FROM greenhouse_hr.allocate_remittance_advice_number($1, $2)`,
    [input.issuerOrganizationId, input.contractorPayableId],
    input.client
  )

  const row = rows[0]

  if (!row) {
    throw new Error('allocate_remittance_advice_number returned no row')
  }

  return mapRow(row)
}

/** Read the already-allocated number for a payable, or null if never emitted. */
export const getRemittanceAdviceNumber = async (
  contractorPayableId: string,
  client?: PoolClient
): Promise<RemittanceAdviceNumber | null> => {
  const rows = await runRows<AllocatorRow>(
    `SELECT remittance_number, sequential_value, format_version
     FROM greenhouse_hr.remittance_advice_numbers
     WHERE contractor_payable_id = $1`,
    [contractorPayableId],
    client
  )

  return rows[0] ? mapRow(rows[0]) : null
}

/**
 * Batched read of already-allocated numbers for a set of payables (read-only,
 * never allocates). Returns a Map keyed by payable id; payables not yet emitted
 * are simply absent. Used by the list surfaces to show the number when present.
 */
export const getRemittanceAdviceNumbersForPayables = async (
  contractorPayableIds: string[],
  client?: PoolClient
): Promise<Map<string, string>> => {
  if (contractorPayableIds.length === 0) return new Map()

  const rows = await runRows<{ contractor_payable_id: string; remittance_number: string }>(
    `SELECT contractor_payable_id, remittance_number
     FROM greenhouse_hr.remittance_advice_numbers
     WHERE contractor_payable_id = ANY($1)`,
    [contractorPayableIds],
    client
  )

  return new Map(rows.map(r => [r.contractor_payable_id, r.remittance_number]))
}
